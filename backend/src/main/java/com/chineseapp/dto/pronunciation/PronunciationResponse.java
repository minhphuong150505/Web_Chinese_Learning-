package com.chineseapp.dto.pronunciation;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * @param scripted     whether the attempt was read against a reference text.
 *                     When {@code false} (free speech in voice chat),
 *                     {@code completeness} is {@code null} because there is no
 *                     reference to measure completeness against.
 * @param completeness {@code null} for unscripted attempts; see {@code scripted}.
 */
public record PronunciationResponse(
    UUID id,
    String referenceText,
    String recognizedText,
    double accuracy,
    double fluency,
    Double completeness,
    Double prosody,
    double pronScore,
    boolean scripted,
    List<WordScore> words,
    Instant createdAt
) {}
