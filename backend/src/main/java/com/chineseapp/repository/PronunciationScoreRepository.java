package com.chineseapp.repository;

import com.chineseapp.entity.PronunciationScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface PronunciationScoreRepository extends JpaRepository<PronunciationScore, UUID> {

    List<PronunciationScore> findTop20ByUserIdOrderByCreatedAtDesc(UUID userId);

    // Round 26 Phase 0 retention sweep: clips whose retention window has passed.
    List<PronunciationScore> findByAudioPathIsNotNullAndAudioRetentionUntilBefore(Instant cutoff);

    @Query("""
        select p.audioPath
        from PronunciationScore p
        where p.userId = :userId and p.audioPath is not null
        """)
    List<String> findAudioPathsByUserId(@Param("userId") UUID userId);
}
