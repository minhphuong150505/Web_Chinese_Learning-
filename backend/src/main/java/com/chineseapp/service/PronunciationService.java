package com.chineseapp.service;

import com.chineseapp.dto.pronunciation.PronunciationResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface PronunciationService {
    PronunciationResponse assess(UUID userId, MultipartFile audio, String referenceText, boolean audioConsent);

    PronunciationResponse assessUnscripted(UUID userId, MultipartFile audio);

    List<PronunciationResponse> historyTop20(UUID userId);
}
