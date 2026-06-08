package com.chineseapp.service.impl;

import com.chineseapp.client.AzureSpeechClient;
import com.chineseapp.client.AzureSpeechClient.AssessmentRawResult;
import com.chineseapp.client.ToneAnalysisClient;
import com.chineseapp.client.ToneAnalysisClient.SyllableInput;
import com.chineseapp.client.ToneAnalysisClient.ToneResult;
import com.chineseapp.dto.pronunciation.PronunciationResponse;
import com.chineseapp.dto.pronunciation.WordScore;
import com.chineseapp.dto.pronunciation.WordScore.PhonemeScore;
import com.chineseapp.dto.pronunciation.WordScore.SyllableScore;
import com.chineseapp.entity.PronunciationScore;
import com.chineseapp.exception.ApiException;
import com.chineseapp.repository.PronunciationScoreRepository;
import com.chineseapp.service.AudioConversionService;
import com.chineseapp.service.CorpusAudioStorage;
import com.chineseapp.service.PronunciationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class PronunciationServiceImpl implements PronunciationService {

    private static final Logger log = LoggerFactory.getLogger(PronunciationServiceImpl.class);

    // Azure timestamps are in 100-nanosecond ticks.
    private static final double TICKS_PER_SECOND = 10_000_000.0;

    private final AudioConversionService audioConv;
    private final AzureSpeechClient azure;
    private final ToneAnalysisClient toneAnalysis;
    private final PronunciationScoreRepository repo;
    private final CorpusAudioStorage corpusStorage;
    private final ObjectMapper objectMapper;

    public PronunciationServiceImpl(AudioConversionService audioConv,
                                     AzureSpeechClient azure,
                                     ToneAnalysisClient toneAnalysis,
                                     PronunciationScoreRepository repo,
                                     CorpusAudioStorage corpusStorage,
                                     ObjectMapper objectMapper) {
        this.audioConv = audioConv;
        this.azure = azure;
        this.toneAnalysis = toneAnalysis;
        this.repo = repo;
        this.corpusStorage = corpusStorage;
        this.objectMapper = objectMapper;
    }

    @Override
    public PronunciationResponse assess(UUID userId, MultipartFile audio, String referenceText, boolean audioConsent) {
        return assessInternal(userId, audio, referenceText, false, audioConsent);
    }

    @Override
    public PronunciationResponse assessUnscripted(UUID userId, MultipartFile audio) {
        // Free-speech turns have no reference text, so they can't auto-label the
        // target tone — we never collect them for the corpus.
        return assessInternal(userId, audio, "", true, false);
    }

    private PronunciationResponse assessInternal(UUID userId,
                                                  MultipartFile audio,
                                                  String referenceText,
                                                  boolean unscripted,
                                                  boolean audioConsent) {
        File webm = null;
        File wav = null;
        try {
            webm = File.createTempFile("pron-", ".webm");
            audio.transferTo(webm);
            wav = audioConv.toWav16kMono(webm);

            AssessmentRawResult raw = unscripted
                ? azure.assessUnscripted(wav)
                : azure.assess(wav, referenceText);

            List<WordScore> words = parseWordScores(raw.detailedJson(), wav);
            String storedReferenceText = unscripted ? raw.recognizedText() : referenceText;
            boolean scripted = !unscripted;

            // Round 26 Phase 0: persist the 16k mono WAV for the tone corpus, but
            // only when the learner opted in (and collection is enabled). The id is
            // generated up front so the clip filename joins back to this row.
            UUID id = UUID.randomUUID();
            Instant now = Instant.now();
            String audioPath = corpusStorage.storeIfConsented(id, wav, audioConsent).orElse(null);
            Instant retentionUntil = audioPath == null ? null : corpusStorage.retentionUntil(now);

            PronunciationScore score = new PronunciationScore(
                id,
                userId,
                storedReferenceText,
                raw.recognizedText(),
                toScale2(raw.accuracy()),
                toScale2(raw.fluency()),
                toScale2(raw.completeness()),
                raw.prosody() == null ? null : toScale2(raw.prosody()),
                toScale2(raw.pron()),
                writeWordsJson(words),
                scripted,
                audioConsent,
                audioPath,
                retentionUntil,
                now
            );
            repo.save(score);

            return toResponse(score, words);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read uploaded audio: " + ex.getMessage());
        } finally {
            if (webm != null) {
                webm.delete();
            }
            if (wav != null) {
                wav.delete();
            }
        }
    }

    @Override
    public List<PronunciationResponse> historyTop20(UUID userId) {
        return repo.findTop20ByUserIdOrderByCreatedAtDesc(userId).stream()
            .map(score -> toResponse(score, readWordsJson(score.getWordDetailsJson())))
            .toList();
    }

    /**
     * Parses Azure's per-word breakdown and enriches each syllable with a
     * Mandarin tone score from the F0 pitch-contour engine. Tone enrichment is
     * best-effort: if the engine returns nothing, syllables keep null tone fields.
     */
    private List<WordScore> parseWordScores(String detailedJson, File wav) {
        List<RawWord> rawWords = parseRawWords(detailedJson);

        // Flatten syllables across all words and ask the tone engine to score
        // them in one call, then map the results back by position.
        List<SyllableInput> toneInputs = new ArrayList<>();
        for (RawWord word : rawWords) {
            for (RawSyllable syl : word.syllables) {
                toneInputs.add(new SyllableInput(syl.pinyin, syl.tone, syl.startSec, syl.durSec));
            }
        }
        List<ToneResult> toneResults = toneAnalysis.analyze(wav, toneInputs);

        List<WordScore> words = new ArrayList<>();
        int toneIdx = 0;
        for (RawWord word : rawWords) {
            List<SyllableScore> syllables = new ArrayList<>();
            for (RawSyllable syl : word.syllables) {
                Integer detectedTone = null;
                Double toneScore = null;
                if (toneIdx < toneResults.size()) {
                    ToneResult tr = toneResults.get(toneIdx);
                    detectedTone = tr.detectedTone();
                    toneScore = tr.toneScore();
                }
                toneIdx++;
                syllables.add(new SyllableScore(
                    syl.syllable,
                    syl.accuracy,
                    syl.tone,
                    detectedTone,
                    toneScore
                ));
            }
            words.add(new WordScore(word.word, word.accuracy, word.errorType, syllables, word.phonemes));
        }
        return words;
    }

    private List<RawWord> parseRawWords(String detailedJson) {
        try {
            JsonNode root = objectMapper.readTree(detailedJson);
            JsonNode wordsNode = root.path("NBest").path(0).path("Words");
            List<RawWord> words = new ArrayList<>();
            for (JsonNode wordNode : wordsNode) {
                JsonNode assessment = wordNode.path("PronunciationAssessment");
                words.add(new RawWord(
                    wordNode.path("Word").asText(),
                    assessment.path("AccuracyScore").asDouble(),
                    assessment.path("ErrorType").asText(),
                    parseSyllables(wordNode),
                    parsePhonemes(wordNode.path("Phonemes"))
                ));
            }
            return words;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Azure response unparseable");
        }
    }

    private List<RawSyllable> parseSyllables(JsonNode wordNode) {
        JsonNode syllablesNode = wordNode.path("Syllables");
        List<RawSyllable> syllables = new ArrayList<>();

        // Azure usually times each syllable; if not, fall back to splitting the
        // word's window evenly so the tone engine still gets a window per syllable.
        long wordOffset = wordNode.path("Offset").asLong(0);
        long wordDuration = wordNode.path("Duration").asLong(0);
        int count = syllablesNode.size();
        int index = 0;

        for (JsonNode node : syllablesNode) {
            String raw = node.path("Syllable").asText();
            double accuracy = node.path("PronunciationAssessment").path("AccuracyScore").asDouble();

            long offset = node.path("Offset").asLong(-1);
            long duration = node.path("Duration").asLong(-1);
            if (offset < 0 || duration <= 0) {
                // Azure didn't time this syllable: split the word window evenly so
                // the tone engine still gets a window (less precise — boundaries
                // may blur across syllables).
                log.debug("Syllable '{}' missing timing; using even split of word window", raw);
                long slice = count > 0 ? wordDuration / count : 0;
                offset = wordOffset + (long) index * slice;
                duration = slice;
            }

            syllables.add(new RawSyllable(
                raw,
                stripTone(raw),
                parseTone(raw),
                accuracy,
                offset / TICKS_PER_SECOND,
                duration / TICKS_PER_SECOND
            ));
            index++;
        }
        return syllables;
    }

    private List<PhonemeScore> parsePhonemes(JsonNode phonemesNode) {
        List<PhonemeScore> phonemes = new ArrayList<>();
        for (JsonNode node : phonemesNode) {
            phonemes.add(new PhonemeScore(
                node.path("Phoneme").asText(),
                node.path("PronunciationAssessment").path("AccuracyScore").asDouble()
            ));
        }
        return phonemes;
    }

    /** Trailing digit of an Azure syllable ("ni3") is the tone; 0 = neutral. */
    private int parseTone(String syllable) {
        if (syllable == null || syllable.isEmpty()) {
            return 0;
        }
        char last = syllable.charAt(syllable.length() - 1);
        return Character.isDigit(last) ? last - '0' : 0;
    }

    private String stripTone(String syllable) {
        if (syllable == null || syllable.isEmpty()) {
            return "";
        }
        char last = syllable.charAt(syllable.length() - 1);
        return Character.isDigit(last) ? syllable.substring(0, syllable.length() - 1) : syllable;
    }

    private String writeWordsJson(List<WordScore> words) {
        try {
            return objectMapper.writeValueAsString(words);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize word scores");
        }
    }

    private List<WordScore> readWordsJson(String json) {
        try {
            return objectMapper.readerForListOf(WordScore.class).readValue(json);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to deserialize word scores");
        }
    }

    private PronunciationResponse toResponse(PronunciationScore score, List<WordScore> words) {
        // Completeness only means something when read against a reference text.
        Double completeness = score.isScripted() ? score.getCompletenessScore().doubleValue() : null;
        return new PronunciationResponse(
            score.getId(),
            score.getReferenceText(),
            score.getRecognizedText(),
            score.getAccuracyScore().doubleValue(),
            score.getFluencyScore().doubleValue(),
            completeness,
            score.getProsodyScore() == null ? null : score.getProsodyScore().doubleValue(),
            score.getPronScore().doubleValue(),
            score.isScripted(),
            words,
            score.getCreatedAt()
        );
    }

    private BigDecimal toScale2(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }

    private record RawWord(String word, double accuracy, String errorType,
                           List<RawSyllable> syllables, List<PhonemeScore> phonemes) {}

    private record RawSyllable(String syllable, String pinyin, int tone, double accuracy,
                               double startSec, double durSec) {}
}
