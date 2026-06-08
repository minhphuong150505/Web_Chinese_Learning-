package com.chineseapp.service;

import com.chineseapp.client.AzureSpeechClient;
import com.chineseapp.client.AzureSpeechClient.AssessmentRawResult;
import com.chineseapp.dto.pronunciation.PronunciationResponse;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PronunciationServiceImplTest {

    @Test
    void assess_givenAzureResponse_thenParsesWordScoresAndSavesRow() throws IOException {
        AudioConversionService audioConv = mock(AudioConversionService.class);
        AzureSpeechClient azure = mock(AzureSpeechClient.class);
        PronunciationScoreRepository repo = mock(PronunciationScoreRepository.class);
        ObjectMapper objectMapper = new ObjectMapper();
        PronunciationService service = new PronunciationServiceImpl(audioConv, azure, repo, objectMapper);

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
            PronunciationResponse response = service.assess(userId, audio, "你好世界");

            assertThat(response.words()).hasSize(2);
            assertThat(response.words().get(0).word()).isEqualTo("你好");
            assertThat(response.words().get(0).accuracyScore()).isEqualTo(92.5);
            assertThat(response.words().get(0).syllables()).hasSize(2);
            assertThat(response.words().get(0).phonemes()).hasSize(2);

            // The saved row is stamped with the authenticated user's id (write-scoping).
            ArgumentCaptor<PronunciationScore> scoreCaptor = ArgumentCaptor.forClass(PronunciationScore.class);
            verify(repo, times(1)).save(scoreCaptor.capture());
            assertThat(scoreCaptor.getValue().getUserId()).isEqualTo(userId);
        } finally {
            Files.deleteIfExists(wav.toPath());
        }
    }

    @Test
    void assessUnscripted_usesRecognizedTextAsStoredReference() throws IOException {
        AudioConversionService audioConv = mock(AudioConversionService.class);
        AzureSpeechClient azure = mock(AzureSpeechClient.class);
        PronunciationScoreRepository repo = mock(PronunciationScoreRepository.class);
        PronunciationService service = new PronunciationServiceImpl(
            audioConv, azure, repo, new ObjectMapper()
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
            verify(azure).assessUnscripted(wav);
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
