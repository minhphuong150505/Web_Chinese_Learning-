package com.chineseapp.service.impl;

import com.chineseapp.client.LlmClient;
import com.chineseapp.dto.chat.ChatResponse;
import com.chineseapp.dto.chat.ConversationDto;
import com.chineseapp.dto.chat.MessageDto;
import com.chineseapp.entity.Conversation;
import com.chineseapp.entity.Message;
import com.chineseapp.exception.ApiException;
import com.chineseapp.repository.ConversationRepository;
import com.chineseapp.repository.MessageRepository;
import com.chineseapp.service.ConversationService;
import com.chineseapp.service.TtsService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ConversationServiceImpl implements ConversationService {
    private static final String SYSTEM_PROMPT = """
        You are a friendly Mandarin Chinese conversation partner for a learner.
        Rules:
        1. Reply in simplified Chinese (简体中文) by default. If the learner writes in another language, reply in Chinese first, then a brief English clarification in parentheses.
        2. Keep replies short (1-3 sentences) and at the learner's level.
        3. If the learner's Chinese has a clear mistake, gently correct it in one sentence before continuing.
        4. Always end with a small question to keep the conversation going.
        """;

    private final ConversationRepository convRepo;
    private final MessageRepository msgRepo;
    private final LlmClient llm;
    private final TtsService tts;

    public ConversationServiceImpl(ConversationRepository convRepo,
                                   MessageRepository msgRepo,
                                   LlmClient llm,
                                   TtsService tts) {
        this.convRepo = convRepo;
        this.msgRepo = msgRepo;
        this.llm = llm;
        this.tts = tts;
    }

    @Override
    @Transactional
    public ConversationDto createConversation(UUID userId) {
        Instant now = Instant.now();
        Conversation conversation = new Conversation(UUID.randomUUID(), userId, "New conversation", now, now);
        return ConversationDto.from(convRepo.save(conversation));
    }

    @Override
    public List<ConversationDto> listConversations(UUID userId) {
        return convRepo.findByUserIdOrderByUpdatedAtDesc(userId).stream()
            .map(ConversationDto::from)
            .toList();
    }

    @Override
    public List<MessageDto> listMessages(UUID userId, UUID conversationId) {
        Conversation conversation = findConversation(userId, conversationId);
        return msgRepo.findByConversationOrderByCreatedAtAsc(conversation).stream()
            .map(MessageDto::from)
            .toList();
    }

    @Override
    @Transactional
    public ChatResponse sendMessage(UUID userId, UUID conversationId, String userText) {
        Conversation conversation = findConversation(userId, conversationId);

        Message userMessage = new Message(
            UUID.randomUUID(),
            conversation,
            "user",
            userText,
            null,
            Instant.now()
        );
        msgRepo.save(userMessage);

        List<LlmClient.LlmMessage> history = msgRepo.findByConversationOrderByCreatedAtAsc(conversation).stream()
            .map(m -> new LlmClient.LlmMessage(m.getRole(), m.getContent()))
            .toList();
        String assistantText = llm.chat(prependSystemPrompt(history));

        Message assistantMessage = new Message(
            UUID.randomUUID(),
            conversation,
            "assistant",
            assistantText,
            tts.synthesize(assistantText),
            Instant.now()
        );
        msgRepo.save(assistantMessage);

        conversation.setUpdatedAt(Instant.now());
        convRepo.save(conversation);

        return new ChatResponse(MessageDto.from(userMessage), MessageDto.from(assistantMessage));
    }

    private Conversation findConversation(UUID userId, UUID conversationId) {
        // Scoped by userId: another user's conversation is a 404, not a 403.
        return convRepo.findByIdAndUserId(conversationId, userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Conversation not found"));
    }

    private List<LlmClient.LlmMessage> prependSystemPrompt(List<LlmClient.LlmMessage> history) {
        List<LlmClient.LlmMessage> messages = new ArrayList<>(history.size() + 1);
        messages.add(new LlmClient.LlmMessage("system", SYSTEM_PROMPT));
        messages.addAll(history);
        return messages;
    }
}
