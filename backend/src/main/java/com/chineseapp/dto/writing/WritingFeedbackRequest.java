package com.chineseapp.dto.writing;

import jakarta.validation.constraints.NotBlank;

public record WritingFeedbackRequest(@NotBlank String text, String topic) {}
