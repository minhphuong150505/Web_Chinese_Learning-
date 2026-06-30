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
 * @param lang         target-language code of the attempt ({@code zh}, {@code en}, …).
 *                     Tells the UI whether to render pinyin/tone columns (only for
 *                     {@code zh}).
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
    String lang,
    List<WordScore> words,
    Instant createdAt
) {}
