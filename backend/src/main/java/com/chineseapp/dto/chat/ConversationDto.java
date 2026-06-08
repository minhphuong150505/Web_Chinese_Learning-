package com.chineseapp.dto.chat;

import com.chineseapp.entity.Conversation;

import java.time.Instant;
import java.util.UUID;

public record ConversationDto(UUID id, String title, Instant createdAt, Instant updatedAt) {
    public static ConversationDto from(Conversation c) {
        return new ConversationDto(c.getId(), c.getTitle(), c.getCreatedAt(), c.getUpdatedAt());
    }
}
