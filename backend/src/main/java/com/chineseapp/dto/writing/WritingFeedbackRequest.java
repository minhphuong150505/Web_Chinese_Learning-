package com.chineseapp.dto.writing;

import jakarta.validation.constraints.NotBlank;

public record WritingFeedbackRequest(@NotBlank String text, String topic, String lang) {
    /** Two-arg form keeps the Mandarin default when no practice language is given. */
    public WritingFeedbackRequest(String text, String topic) {
        this(text, topic, null);
    }
}
