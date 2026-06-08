package com.chineseapp.dto.pronunciation;

import java.util.List;

public record WordScore(
    String word,
    double accuracyScore,
    String errorType,
    List<SyllableScore> syllables,
    List<PhonemeScore> phonemes
) {
    /**
     * One syllable's scores. {@code syllable} is Azure's raw pinyin+tone-digit
     * form (e.g. {@code "ni3"}). {@code expectedTone} is the tone the text calls
     * for (1-4, or 0 for neutral). {@code detectedTone}/{@code toneScore} come
     * from the F0 pitch-contour engine and are {@code null} when the contour
     * could not be judged or the engine is unavailable.
     */
    public record SyllableScore(
        String syllable,
        double accuracyScore,
        Integer expectedTone,
        Integer detectedTone,
        Double toneScore
    ) {}

    public record PhonemeScore(String phoneme, double accuracyScore) {}
}
