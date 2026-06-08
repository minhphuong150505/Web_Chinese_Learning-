package com.chineseapp.dto.pronunciation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PronunciationResponse(
    UUID id,
    String referenceText,
    String recognizedText,
    double accuracy,
    double fluency,
    double completeness,
    Double prosody,
    double pronScore,
    List<WordScore> words,
    Instant createdAt
) {}
