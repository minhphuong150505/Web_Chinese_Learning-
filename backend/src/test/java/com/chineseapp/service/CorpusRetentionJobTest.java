package com.chineseapp.service;

import com.chineseapp.entity.PronunciationScore;
import com.chineseapp.repository.PronunciationScoreRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CorpusRetentionJobTest {

    private PronunciationScore scoreWithAudio(String path) {
        return new PronunciationScore(
            UUID.randomUUID(), UUID.randomUUID(), "ref", "rec",
            BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, null, BigDecimal.ONE,
            "[]", true, true, path, Instant.now().minusSeconds(1), Instant.now()
        );
    }

    @Test
    void purgeExpired_deletesFilesClearsPointersAndSaves() {
        PronunciationScoreRepository repo = mock(PronunciationScoreRepository.class);
        CorpusAudioStorage storage = mock(CorpusAudioStorage.class);
        PronunciationScore a = scoreWithAudio("2026-03/a.wav");
        PronunciationScore b = scoreWithAudio("2026-03/b.wav");
        when(repo.findByAudioPathIsNotNullAndAudioRetentionUntilBefore(any())).thenReturn(List.of(a, b));

        new CorpusRetentionJob(repo, storage).purgeExpired();

        verify(storage).delete("2026-03/a.wav");
        verify(storage).delete("2026-03/b.wav");
        assertThat(a.getAudioPath()).isNull();
        assertThat(a.getAudioRetentionUntil()).isNull();
        assertThat(b.getAudioPath()).isNull();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PronunciationScore>> saved = ArgumentCaptor.forClass(List.class);
        verify(repo).saveAll(saved.capture());
        assertThat(saved.getValue()).containsExactly(a, b);
    }

    @Test
    void purgeExpired_whenNothingExpired_doesNothing() {
        PronunciationScoreRepository repo = mock(PronunciationScoreRepository.class);
        CorpusAudioStorage storage = mock(CorpusAudioStorage.class);
        when(repo.findByAudioPathIsNotNullAndAudioRetentionUntilBefore(any())).thenReturn(List.of());

        new CorpusRetentionJob(repo, storage).purgeExpired();

        verify(repo, never()).saveAll(any());
        verify(storage, never()).delete(any());
    }
}
