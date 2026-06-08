package com.chineseapp.service;

import com.chineseapp.entity.PronunciationScore;
import com.chineseapp.repository.PronunciationScoreRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Round 26 Phase 0: enforces the corpus retention window. Once a clip's
 * {@code audioRetentionUntil} passes, the file is deleted and the row's audio
 * pointer is cleared (the scores themselves are kept). Runs daily.
 */
@Component
public class CorpusRetentionJob {

    private static final Logger log = LoggerFactory.getLogger(CorpusRetentionJob.class);

    private final PronunciationScoreRepository repo;
    private final CorpusAudioStorage storage;

    public CorpusRetentionJob(PronunciationScoreRepository repo, CorpusAudioStorage storage) {
        this.repo = repo;
        this.storage = storage;
    }

    @Scheduled(cron = "0 30 3 * * *")
    public void purgeExpired() {
        List<PronunciationScore> expired =
            repo.findByAudioPathIsNotNullAndAudioRetentionUntilBefore(Instant.now());
        if (expired.isEmpty()) {
            return;
        }
        for (PronunciationScore score : expired) {
            storage.delete(score.getAudioPath());
            score.clearAudio();
        }
        repo.saveAll(expired);
        log.info("Corpus retention: purged {} expired recording(s)", expired.size());
    }
}
