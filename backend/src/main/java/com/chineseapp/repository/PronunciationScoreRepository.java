package com.chineseapp.repository;

import com.chineseapp.entity.PronunciationScore;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PronunciationScoreRepository extends JpaRepository<PronunciationScore, UUID> {

    List<PronunciationScore> findTop20ByUserIdOrderByCreatedAtDesc(UUID userId);
}
