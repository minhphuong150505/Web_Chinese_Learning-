package com.chineseapp.service.impl;

import com.chineseapp.client.LlmClient;
import com.chineseapp.dto.chat.ChatResponse;
import com.chineseapp.dto.chat.ConversationDto;
import com.chineseapp.dto.chat.MessageDto;
import com.chineseapp.dto.chat.VoiceTurnResponse;
import com.chineseapp.dto.pronunciation.PronunciationResponse;
import com.chineseapp.entity.Conversation;
import com.chineseapp.entity.Message;
import com.chineseapp.exception.ApiException;
import com.chineseapp.repository.ConversationRepository;
import com.chineseapp.repository.MessageRepository;
import com.chineseapp.service.ConversationService;
import com.chineseapp.service.PronunciationService;
import com.chineseapp.service.TtsService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

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
    private static final String VOICE_SYSTEM_PROMPT = """
        You are an AI Mandarin tutor role-playing as a server in a small Beijing restaurant.
        The latest user message is speech recognized from a Mandarin learner.
        Return ONLY one valid JSON object with exactly these fields:
        {
          "reply": "one short, natural simplified-Chinese response that continues the restaurant conversation",
          "contextScore": 0-100,
          "grammarScore": 0-100,
          "feedback": "specific Vietnamese feedback in no more than 30 words",
          "suggestedReply": "a corrected or more natural simplified-Chinese version, or an empty string if no correction is needed"
        }
        Score context against the current conversation and the server/customer role.
        Score grammar and word choice independently from pronunciation.
        Keep the reply to one or two short sentences and end with a natural prompt when appropriate.
        Do not use markdown or add text outside the JSON object.
        """;

    private final ConversationRepository convRepo;
    private final MessageRepository msgRepo;
    private final LlmClient llm;
    private final TtsService tts;
    private final PronunciationService pronunciation;
    private final ObjectMapper objectMapper;

    public ConversationServiceImpl(ConversationRepository convRepo,
                                   MessageRepository msgRepo,
                                   LlmClient llm,
                                   TtsService tts,
                                   PronunciationService pronunciation,
                                   ObjectMapper objectMapper) {
        this.convRepo = convRepo;
        this.msgRepo = msgRepo;
        this.llm = llm;
        this.tts = tts;
        this.pronunciation = pronunciation;
        this.objectMapper = objectMapper;
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

    @Override
    @Transactional
    public VoiceTurnResponse sendVoiceTurn(UUID userId, UUID conversationId, MultipartFile audio) {
        Conversation conversation = findConversation(userId, conversationId);
        PronunciationResponse assessment = pronunciation.assessUnscripted(userId, audio);
        String recognizedText = assessment.recognizedText();
        if (!StringUtils.hasText(recognizedText)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "No Mandarin speech was recognized");
        }

        Message userMessage = new Message(
            UUID.randomUUID(),
            conversation,
            "user",
            recognizedText,
            null,
            Instant.now()
        );
        msgRepo.save(userMessage);

        List<LlmClient.LlmMessage> history = msgRepo.findByConversationOrderByCreatedAtAsc(conversation).stream()
            .map(m -> new LlmClient.LlmMessage(m.getRole(), m.getContent()))
            .toList();
        VoiceReply voiceReply = parseVoiceReply(llm.chat(prependVoiceSystemPrompt(history)));

        Message assistantMessage = new Message(
            UUID.randomUUID(),
            conversation,
            "assistant",
            voiceReply.reply(),
            tts.synthesize(voiceReply.reply()),
            Instant.now()
        );
        msgRepo.save(assistantMessage);

        conversation.setUpdatedAt(Instant.now());
        convRepo.save(conversation);

        return new VoiceTurnResponse(
            MessageDto.from(userMessage),
            MessageDto.from(assistantMessage),
            assessment,
            voiceReply.contextScore(),
            voiceReply.grammarScore(),
            voiceReply.feedback(),
            voiceReply.suggestedReply()
        );
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

    private List<LlmClient.LlmMessage> prependVoiceSystemPrompt(List<LlmClient.LlmMessage> history) {
        List<LlmClient.LlmMessage> messages = new ArrayList<>(history.size() + 1);
        messages.add(new LlmClient.LlmMessage("system", VOICE_SYSTEM_PROMPT));
        messages.addAll(history);
        return messages;
    }

    private VoiceReply parseVoiceReply(String raw) {
        try {
            String json = extractJsonObject(raw);
            JsonNode root = objectMapper.readTree(json);
            String reply = root.path("reply").asText().trim();
            if (!StringUtils.hasText(reply)) {
                throw new IllegalArgumentException("missing reply");
            }
            return new VoiceReply(
                reply,
                clampScore(root.path("contextScore").asInt(70)),
                clampScore(root.path("grammarScore").asInt(70)),
                root.path("feedback").asText("Hãy tiếp tục trả lời ngắn gọn và đúng vai hội thoại.").trim(),
                root.path("suggestedReply").asText("").trim()
            );
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "LLM returned invalid voice assessment");
        }
    }

    private String extractJsonObject(String raw) {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start < 0 || end <= start) {
            throw new IllegalArgumentException("missing JSON object");
        }
        return raw.substring(start, end + 1);
    }

    private int clampScore(int score) {
        return Math.max(0, Math.min(100, score));
    }

    private record VoiceReply(
        String reply,
        int contextScore,
        int grammarScore,
        String feedback,
        String suggestedReply
    ) {
    }
}
