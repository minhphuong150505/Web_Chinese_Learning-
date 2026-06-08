package com.chineseapp.dto.pronunciation;

import java.util.List;

public record WordScore(
    String word,
    double accuracyScore,
    String errorType,
    List<SyllableScore> syllables,
    List<PhonemeScore> phonemes
) {
    public record SyllableScore(String syllable, double accuracyScore) {}

    public record PhonemeScore(String phoneme, double accuracyScore) {}
}
