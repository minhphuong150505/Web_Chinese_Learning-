package com.chineseapp.dto.writing;

import jakarta.validation.constraints.Size;

public record CreateWritingPromptRequest(
    @Size(max = 80) String topicTitle,
    @Size(max = 1200) String context
) {
}
