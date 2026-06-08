package com.chineseapp.service.impl;

import com.chineseapp.client.AzureSpeechClient;
import com.chineseapp.client.AzureSpeechClient.AssessmentRawResult;
import com.chineseapp.dto.pronunciation.PronunciationResponse;
import com.chineseapp.dto.pronunciation.WordScore;
import com.chineseapp.dto.pronunciation.WordScore.PhonemeScore;
import com.chineseapp.dto.pronunciation.WordScore.SyllableScore;
import com.chineseapp.entity.PronunciationScore;
import com.chineseapp.exception.ApiException;
import com.chineseapp.repository.PronunciationScoreRepository;
import com.chineseapp.service.AudioConversionService;
import com.chineseapp.service.PronunciationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    private final AudioConversionService audioConv;
    private final AzureSpeechClient azure;
    private final PronunciationScoreRepository repo;
    private final ObjectMapper objectMapper;

    public PronunciationServiceImpl(AudioConversionService audioConv,
                                     AzureSpeechClient azure,
                                     PronunciationScoreRepository repo,
                                     ObjectMapper objectMapper) {
        this.audioConv = audioConv;
        this.azure = azure;
        this.repo = repo;
        this.objectMapper = objectMapper;
    }

    @Override
    public PronunciationResponse assess(UUID userId, MultipartFile audio, String referenceText) {
        File webm = null;
        File wav = null;
        try {
            webm = File.createTempFile("pron-", ".webm");
            audio.transferTo(webm);
            wav = audioConv.toWav16kMono(webm);

            AssessmentRawResult raw = azure.assess(wav, referenceText);
            List<WordScore> words = parseWordScores(raw.detailedJson());

            PronunciationScore score = new PronunciationScore(
                UUID.randomUUID(),
                userId,
                referenceText,
                raw.recognizedText(),
                toScale2(raw.accuracy()),
                toScale2(raw.fluency()),
                toScale2(raw.completeness()),
                raw.prosody() == null ? null : toScale2(raw.prosody()),
                toScale2(raw.pron()),
                writeWordsJson(words),
                Instant.now()
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

    private List<WordScore> parseWordScores(String detailedJson) {
        try {
            JsonNode root = objectMapper.readTree(detailedJson);
            JsonNode wordsNode = root.path("NBest").path(0).path("Words");
            List<WordScore> words = new ArrayList<>();
            for (JsonNode wordNode : wordsNode) {
                JsonNode assessment = wordNode.path("PronunciationAssessment");
                words.add(new WordScore(
                    wordNode.path("Word").asText(),
                    assessment.path("AccuracyScore").asDouble(),
                    assessment.path("ErrorType").asText(),
                    parseSyllables(wordNode.path("Syllables")),
                    parsePhonemes(wordNode.path("Phonemes"))
                ));
            }
            return words;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Azure response unparseable");
        }
    }

    private List<SyllableScore> parseSyllables(JsonNode syllablesNode) {
        List<SyllableScore> syllables = new ArrayList<>();
        for (JsonNode node : syllablesNode) {
            syllables.add(new SyllableScore(
                node.path("Syllable").asText(),
                node.path("PronunciationAssessment").path("AccuracyScore").asDouble()
            ));
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
        return new PronunciationResponse(
            score.getId(),
            score.getReferenceText(),
            score.getRecognizedText(),
            score.getAccuracyScore().doubleValue(),
            score.getFluencyScore().doubleValue(),
            score.getCompletenessScore().doubleValue(),
            score.getProsodyScore() == null ? null : score.getProsodyScore().doubleValue(),
            score.getPronScore().doubleValue(),
            words,
            score.getCreatedAt()
        );
    }

    private BigDecimal toScale2(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }
}
