package com.chineseapp.service;

import com.chineseapp.client.AzureSpeechClient;
import com.chineseapp.client.AzureSpeechClient.AssessmentRawResult;
import com.chineseapp.client.ToneAnalysisClient;
import com.chineseapp.client.ToneAnalysisClient.ToneResult;
import com.chineseapp.dto.pronunciation.PronunciationResponse;
import com.chineseapp.dto.pronunciation.WordScore;
import com.chineseapp.entity.PronunciationScore;
import com.chineseapp.repository.PronunciationScoreRepository;
import com.chineseapp.service.impl.PronunciationServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.StreamUtils;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PronunciationServiceImplTest {

    /** Corpus storage that records nothing — the default for tests not about consent. */
    private static CorpusAudioStorage noStore() {
        CorpusAudioStorage corpus = mock(CorpusAudioStorage.class);
        when(corpus.storeIfConsented(any(), any(), anyBoolean())).thenReturn(Optional.empty());
        return corpus;
    }

    @Test
    void assess_givenAzureResponse_thenParsesWordScoresAndSavesRow() throws IOException {
        AudioConversionService audioConv = mock(AudioConversionService.class);
        AzureSpeechClient azure = mock(AzureSpeechClient.class);
        ToneAnalysisClient tone = mock(ToneAnalysisClient.class);
        PronunciationScoreRepository repo = mock(PronunciationScoreRepository.class);
        ObjectMapper objectMapper = new ObjectMapper();
        when(tone.analyze(any(), any())).thenReturn(java.util.List.of());
        PronunciationService service = new PronunciationServiceImpl(audioConv, azure, tone, repo, noStore(), objectMapper);

        File wav = File.createTempFile("test-", ".wav");
        try {
            when(audioConv.toWav16kMono(any(File.class))).thenReturn(wav);

            String detailedJson = readSampleJson();
            when(azure.assess(any(File.class), anyString())).thenReturn(new AssessmentRawResult(
                "你好世界", 90.0, 88.0, 100.0, 89.5, 89.5, detailedJson
            ));
            when(repo.save(any(PronunciationScore.class))).thenAnswer(invocation -> invocation.getArgument(0));

            MockMultipartFile audio = new MockMultipartFile("audio", "recording.webm", "audio/webm", new byte[]{1, 2, 3});

            UUID userId = UUID.randomUUID();
            PronunciationResponse response = service.assess(userId, audio, "你好世界", false);

            assertThat(response.words()).hasSize(2);
            assertThat(response.words().get(0).word()).isEqualTo("你好");
            assertThat(response.words().get(0).accuracyScore()).isEqualTo(92.5);
            assertThat(response.words().get(0).syllables()).hasSize(2);
            assertThat(response.words().get(0).phonemes()).hasSize(2);

            // Scripted attempt: expected tone parsed from "ni3"/"hao3" and
            // completeness retained.
            assertThat(response.scripted()).isTrue();
            assertThat(response.completeness()).isEqualTo(100.0);
            assertThat(response.words().get(0).syllables().get(0).expectedTone()).isEqualTo(3);

            // The saved row is stamped with the authenticated user's id (write-scoping).
            ArgumentCaptor<PronunciationScore> scoreCaptor = ArgumentCaptor.forClass(PronunciationScore.class);
            verify(repo, times(1)).save(scoreCaptor.capture());
            assertThat(scoreCaptor.getValue().getUserId()).isEqualTo(userId);
        } finally {
            Files.deleteIfExists(wav.toPath());
        }
    }

    @Test
    void assess_givenIncompleteRead_thenReportsAzureScoresVerbatim() throws IOException {
        AudioConversionService audioConv = mock(AudioConversionService.class);
        AzureSpeechClient azure = mock(AzureSpeechClient.class);
        ToneAnalysisClient tone = mock(ToneAnalysisClient.class);
        PronunciationScoreRepository repo = mock(PronunciationScoreRepository.class);
        ObjectMapper objectMapper = new ObjectMapper();
        when(tone.analyze(any(), any())).thenReturn(java.util.List.of());
        PronunciationService service = new PronunciationServiceImpl(audioConv, azure, tone, repo, noStore(), objectMapper);

        File wav = File.createTempFile("test-incomplete-", ".wav");
        try {
            when(audioConv.toWav16kMono(any(File.class))).thenReturn(wav);
            // Reading half the sentence: Azure reports completeness=50 and folds
            // that into its overall PronScore via the documented weighted-lowest
            // formula (0.4·s0 + 0.2·s1 + 0.2·s2 + 0.2·s3, here ≈ 76). We must
            // surface these standard scores unchanged — no custom re-scaling.
            when(azure.assess(any(File.class), anyString())).thenReturn(new AssessmentRawResult(
                "你好", 100.0, 90.0, 50.0, 88.0, 76.0, readSampleJson()
            ));
            when(repo.save(any(PronunciationScore.class))).thenAnswer(invocation -> invocation.getArgument(0));

            MockMultipartFile audio = new MockMultipartFile("audio", "recording.webm", "audio/webm", new byte[]{1, 2, 3});

            PronunciationResponse response = service.assess(UUID.randomUUID(), audio, "你好世界", false);

            // Accuracy stays the raw Azure value; completeness is shown as its own
            // criterion; the overall is Azure's official PronScore — not multiplied
            // by completeness a second time.
            assertThat(response.completeness()).isEqualTo(50.0);
            assertThat(response.accuracy()).isEqualTo(100.0);
            assertThat(response.pronScore()).isEqualTo(76.0);

            ArgumentCaptor<PronunciationScore> scoreCaptor = ArgumentCaptor.forClass(PronunciationScore.class);
            verify(repo).save(scoreCaptor.capture());
            assertThat(scoreCaptor.getValue().getAccuracyScore()).isEqualByComparingTo("100.00");
            assertThat(scoreCaptor.getValue().getPronScore()).isEqualByComparingTo("76.00");
        } finally {
            Files.deleteIfExists(wav.toPath());
        }
    }

    @Test
    void assess_mergesToneResultsOntoCorrectSyllablesAcrossWords() throws IOException {
        AudioConversionService audioConv = mock(AudioConversionService.class);
        AzureSpeechClient azure = mock(AzureSpeechClient.class);
        ToneAnalysisClient tone = mock(ToneAnalysisClient.class);
        PronunciationScoreRepository repo = mock(PronunciationScoreRepository.class);
        PronunciationService service = new PronunciationServiceImpl(audioConv, azure, tone, repo, noStore(), new ObjectMapper());

        File wav = File.createTempFile("test-tone-", ".wav");
        try {
            when(audioConv.toWav16kMono(any(File.class))).thenReturn(wav);
            when(azure.assess(any(File.class), anyString())).thenReturn(new AssessmentRawResult(
                "你好世界", 90.0, 88.0, 100.0, 89.5, 89.5, readSampleJson()
            ));
            when(repo.save(any(PronunciationScore.class))).thenAnswer(i -> i.getArgument(0));

            // Flattened syllable order across the two sample words is:
            // 你好 -> ni3, hao3 ; 世界 -> shi4, jie4. The engine returns one result
            // per syllable in that exact order.
            when(tone.analyze(any(), any())).thenReturn(java.util.List.of(
                new ToneResult("ni", 3, 3, 95.0),
                new ToneResult("hao", 3, 1, 20.0),   // wrong tone, confidently detected
                new ToneResult("shi", 4, 4, 88.0),
                new ToneResult("jie", 4, null, null) // ambiguous: no detected tone
            ));

            MockMultipartFile audio = new MockMultipartFile("audio", "r.webm", "audio/webm", new byte[]{1, 2, 3});
            PronunciationResponse response = service.assess(UUID.randomUUID(), audio, "你好世界", false);

            WordScore hello = response.words().get(0);
            WordScore world = response.words().get(1);
            // First word, second syllable must carry hao3's wrong-tone result — an
            // off-by-one in the flatten/remap would land it on the wrong syllable.
            assertThat(hello.syllables().get(0).toneScore()).isEqualTo(95.0);
            assertThat(hello.syllables().get(1).detectedTone()).isEqualTo(1);
            assertThat(hello.syllables().get(1).toneScore()).isEqualTo(20.0);
            // Tone results map across the word boundary to the second word.
            assertThat(world.syllables().get(0).detectedTone()).isEqualTo(4);
            assertThat(world.syllables().get(1).detectedTone()).isNull();
            assertThat(world.syllables().get(1).toneScore()).isNull();
        } finally {
            Files.deleteIfExists(wav.toPath());
        }
    }

    @Test
    void assess_passesRealAzureSyllableTimingToToneEngine() throws IOException {
        AudioConversionService audioConv = mock(AudioConversionService.class);
        AzureSpeechClient azure = mock(AzureSpeechClient.class);
        ToneAnalysisClient tone = mock(ToneAnalysisClient.class);
        PronunciationScoreRepository repo = mock(PronunciationScoreRepository.class);
        PronunciationService service = new PronunciationServiceImpl(audioConv, azure, tone, repo, noStore(), new ObjectMapper());

        File wav = File.createTempFile("test-timing-", ".wav");
        try {
            when(audioConv.toWav16kMono(any(File.class))).thenReturn(wav);
            when(azure.assess(any(File.class), anyString())).thenReturn(new AssessmentRawResult(
                "你好世界", 90.0, 88.0, 100.0, 89.5, 89.5, readSampleJson()
            ));
            when(repo.save(any(PronunciationScore.class))).thenAnswer(i -> i.getArgument(0));
            when(tone.analyze(any(), any())).thenReturn(java.util.List.of());

            MockMultipartFile audio = new MockMultipartFile("audio", "r.webm", "audio/webm", new byte[]{1, 2, 3});
            service.assess(UUID.randomUUID(), audio, "你好世界", false);

            @SuppressWarnings("unchecked")
            ArgumentCaptor<java.util.List<ToneAnalysisClient.SyllableInput>> captor =
                ArgumentCaptor.forClass(java.util.List.class);
            verify(tone).analyze(any(), captor.capture());
            java.util.List<ToneAnalysisClient.SyllableInput> inputs = captor.getValue();

            // The fixture carries real Azure per-syllable Offset/Duration (100-ns
            // ticks). ni3 = Offset 500000, Duration 3000000 -> 0.05s start, 0.30s.
            // If the timing path silently fell back to even split, start would be 0.
            assertThat(inputs).hasSize(4);
            assertThat(inputs.get(0).pinyin()).isEqualTo("ni");
            assertThat(inputs.get(0).tone()).isEqualTo(3);
            assertThat(inputs.get(0).start()).isEqualTo(0.05);
            assertThat(inputs.get(0).dur()).isEqualTo(0.30);
            // Second word's first syllable shi4 = Offset 6600000 -> 0.66s.
            assertThat(inputs.get(2).start()).isEqualTo(0.66);
        } finally {
            Files.deleteIfExists(wav.toPath());
        }
    }

    @Test
    void assessUnscripted_usesRecognizedTextAsStoredReference() throws IOException {
        AudioConversionService audioConv = mock(AudioConversionService.class);
        AzureSpeechClient azure = mock(AzureSpeechClient.class);
        ToneAnalysisClient tone = mock(ToneAnalysisClient.class);
        PronunciationScoreRepository repo = mock(PronunciationScoreRepository.class);
        when(tone.analyze(any(), any())).thenReturn(java.util.List.of());
        PronunciationService service = new PronunciationServiceImpl(
            audioConv, azure, tone, repo, noStore(), new ObjectMapper()
        );
        File wav = File.createTempFile("test-unscripted-", ".wav");
        try {
            when(audioConv.toWav16kMono(any(File.class))).thenReturn(wav);
            when(azure.assessUnscripted(wav)).thenReturn(new AssessmentRawResult(
                "我要一杯茶。", 91, 87, 0, null, 89, readSampleJson()
            ));
            when(repo.save(any(PronunciationScore.class))).thenAnswer(invocation -> invocation.getArgument(0));
            MockMultipartFile audio = new MockMultipartFile(
                "audio", "voice-turn.webm", "audio/webm", new byte[]{1, 2, 3}
            );

            PronunciationResponse response = service.assessUnscripted(UUID.randomUUID(), audio);

            assertThat(response.referenceText()).isEqualTo("我要一杯茶。");
            assertThat(response.recognizedText()).isEqualTo("我要一杯茶。");
            // Unscripted: completeness is meaningless and is reported as null.
            assertThat(response.scripted()).isFalse();
            assertThat(response.completeness()).isNull();
            verify(azure).assessUnscripted(wav);
        } finally {
            Files.deleteIfExists(wav.toPath());
        }
    }

    @Test
    void assess_withConsent_storesAudioAndPersistsPathAndRetention() throws IOException {
        AudioConversionService audioConv = mock(AudioConversionService.class);
        AzureSpeechClient azure = mock(AzureSpeechClient.class);
        ToneAnalysisClient tone = mock(ToneAnalysisClient.class);
        PronunciationScoreRepository repo = mock(PronunciationScoreRepository.class);
        CorpusAudioStorage corpus = mock(CorpusAudioStorage.class);
        when(tone.analyze(any(), any())).thenReturn(java.util.List.of());
        PronunciationService service =
            new PronunciationServiceImpl(audioConv, azure, tone, repo, corpus, new ObjectMapper());

        File wav = File.createTempFile("test-consent-", ".wav");
        try {
            when(audioConv.toWav16kMono(any(File.class))).thenReturn(wav);
            when(azure.assess(any(File.class), anyString())).thenReturn(new AssessmentRawResult(
                "你好世界", 90.0, 88.0, 100.0, 89.5, 89.5, readSampleJson()
            ));
            when(repo.save(any(PronunciationScore.class))).thenAnswer(i -> i.getArgument(0));
            // The clip is stored under a relative key keyed by the new row's id, and
            // the retention deadline is stamped from the storage policy.
            when(corpus.storeIfConsented(any(UUID.class), eq(wav), eq(true)))
                .thenReturn(Optional.of("2026-06/clip.wav"));
            java.time.Instant deadline = java.time.Instant.parse("2026-09-06T00:00:00Z");
            when(corpus.retentionUntil(any())).thenReturn(deadline);

            MockMultipartFile audio = new MockMultipartFile("audio", "r.webm", "audio/webm", new byte[]{1, 2, 3});
            service.assess(UUID.randomUUID(), audio, "你好世界", true);

            ArgumentCaptor<PronunciationScore> captor = ArgumentCaptor.forClass(PronunciationScore.class);
            verify(repo).save(captor.capture());
            PronunciationScore saved = captor.getValue();
            assertThat(saved.isAudioConsent()).isTrue();
            assertThat(saved.getAudioPath()).isEqualTo("2026-06/clip.wav");
            assertThat(saved.getAudioRetentionUntil()).isEqualTo(deadline);
            // The file passed to storage is the converted 16k mono WAV.
            verify(corpus).storeIfConsented(eq(saved.getId()), eq(wav), eq(true));
        } finally {
            Files.deleteIfExists(wav.toPath());
        }
    }

    @Test
    void assess_withoutConsent_storesNothingAndLeavesPathNull() throws IOException {
        AudioConversionService audioConv = mock(AudioConversionService.class);
        AzureSpeechClient azure = mock(AzureSpeechClient.class);
        ToneAnalysisClient tone = mock(ToneAnalysisClient.class);
        PronunciationScoreRepository repo = mock(PronunciationScoreRepository.class);
        CorpusAudioStorage corpus = mock(CorpusAudioStorage.class);
        when(tone.analyze(any(), any())).thenReturn(java.util.List.of());
        when(corpus.storeIfConsented(any(), any(), anyBoolean())).thenReturn(Optional.empty());
        PronunciationService service =
            new PronunciationServiceImpl(audioConv, azure, tone, repo, corpus, new ObjectMapper());

        File wav = File.createTempFile("test-noconsent-", ".wav");
        try {
            when(audioConv.toWav16kMono(any(File.class))).thenReturn(wav);
            when(azure.assess(any(File.class), anyString())).thenReturn(new AssessmentRawResult(
                "你好世界", 90.0, 88.0, 100.0, 89.5, 89.5, readSampleJson()
            ));
            when(repo.save(any(PronunciationScore.class))).thenAnswer(i -> i.getArgument(0));

            MockMultipartFile audio = new MockMultipartFile("audio", "r.webm", "audio/webm", new byte[]{1, 2, 3});
            service.assess(UUID.randomUUID(), audio, "你好世界", false);

            ArgumentCaptor<PronunciationScore> captor = ArgumentCaptor.forClass(PronunciationScore.class);
            verify(repo).save(captor.capture());
            PronunciationScore saved = captor.getValue();
            assertThat(saved.isAudioConsent()).isFalse();
            assertThat(saved.getAudioPath()).isNull();
            assertThat(saved.getAudioRetentionUntil()).isNull();
            // Nothing is collected when there's no reference-text consent path.
            verify(corpus, never()).retentionUntil(any());
        } finally {
            Files.deleteIfExists(wav.toPath());
        }
    }

    private String readSampleJson() throws IOException {
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("azure-sample.json")) {
            assertThat(in).isNotNull();
            return StreamUtils.copyToString(in, StandardCharsets.UTF_8);
        }
    }
}
