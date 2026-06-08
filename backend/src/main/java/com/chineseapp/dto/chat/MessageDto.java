package com.chineseapp.dto.chat;

import com.chineseapp.entity.Message;

import java.time.Instant;
import java.util.UUID;

public record MessageDto(UUID id, String role, String content, String audioUrl, Instant createdAt) {
    public static MessageDto from(Message m) {
        String audioUrl = m.getAudioPath() == null ? null : "/api/audio/" + m.getAudioPath();
        return new MessageDto(m.getId(), m.getRole(), m.getContent(), audioUrl, m.getCreatedAt());
    }
}
