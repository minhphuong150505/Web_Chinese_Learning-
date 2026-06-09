package com.chineseapp.dto.writing;

public record WritingPromptResponse(
    String title,
    String promptText,
    String level
) {
}
