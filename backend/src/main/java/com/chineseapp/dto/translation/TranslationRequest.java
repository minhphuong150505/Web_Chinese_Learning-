package com.chineseapp.dto.translation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TranslationRequest(@NotBlank String text, @NotNull Direction direction) {
    public enum Direction { VI_TO_ZH, ZH_TO_VI }
}
