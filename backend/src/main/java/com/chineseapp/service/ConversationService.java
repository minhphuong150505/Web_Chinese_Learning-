package com.chineseapp.service;

import com.chineseapp.dto.chat.ChatResponse;
import com.chineseapp.dto.chat.ConversationDto;
import com.chineseapp.dto.chat.CreateConversationRequest;
import com.chineseapp.dto.chat.MessageDto;
import com.chineseapp.dto.chat.VoiceTurnResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface ConversationService {
    ConversationDto createConversation(UUID userId, CreateConversationRequest request);

    List<ConversationDto> listConversations(UUID userId);

    List<MessageDto> listMessages(UUID userId, UUID conversationId);

    ChatResponse sendMessage(UUID userId, UUID conversationId, String userText);

    VoiceTurnResponse sendVoiceTurn(UUID userId, UUID conversationId, MultipartFile audio);
}
