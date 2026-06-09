package com.chineseapp.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateConversationRequest(
    @NotBlank @Size(max = 80) String topicTitle,
    @NotBlank @Size(max = 1200) String scenario
) {
}
