package com.chineseapp.service;

import com.chineseapp.client.LlmClient;
import com.chineseapp.dto.chat.ChatResponse;
import com.chineseapp.dto.chat.ConversationDto;
import com.chineseapp.dto.chat.CreateConversationRequest;
import com.chineseapp.dto.chat.MessageDto;
import com.chineseapp.dto.chat.VoiceTurnResponse;
import com.chineseapp.dto.pronunciation.PronunciationResponse;
import com.chineseapp.entity.Conversation;
import com.chineseapp.entity.Message;
import com.chineseapp.exception.ApiException;
import com.chineseapp.repository.ConversationRepository;
import com.chineseapp.repository.MessageRepository;
import com.chineseapp.service.impl.ConversationServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ConversationServiceImplTest {

    private static final UUID USER_ID = UUID.randomUUID();

    @Test
    void createConversation_givenCustomTitleAndScenario_thenPlansContextAndOpeningMessage() {
        ConversationRepository convRepo = mock(ConversationRepository.class);
        MessageRepository msgRepo = mock(MessageRepository.class);
        LlmClient llm = mock(LlmClient.class);
        TtsService tts = mock(TtsService.class);
        ConversationService service = new ConversationServiceImpl(
            convRepo, msgRepo, llm, tts, mock(PronunciationService.class), new ObjectMapper()
        );
        when(convRepo.save(any(Conversation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(msgRepo.save(any(Message.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(llm.chat(any())).thenReturn("""
            {"systemContext":"Role-play as a potential business partner at a trade fair.",
             "openingMessage":"您好，很高兴认识您。您想介绍什么产品？"}
            """);
        when(tts.synthesize(eq("您好，很高兴认识您。您想介绍什么产品？"), anyString())).thenReturn("trade-fair.mp3");

        ConversationDto dto = service.createConversation(
            USER_ID,
            new CreateConversationRequest(
                "Business fair partner meeting",
                "I am an exhibitor meeting a potential partner and want to discuss products and pricing."
            )
        );

        assertThat(dto.title()).isEqualTo("Business fair partner meeting");

        ArgumentCaptor<Conversation> conversationCaptor = ArgumentCaptor.forClass(Conversation.class);
        verify(convRepo).save(conversationCaptor.capture());
        assertThat(conversationCaptor.getValue().getUserId()).isEqualTo(USER_ID);

        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        verify(msgRepo, org.mockito.Mockito.times(2)).save(messageCaptor.capture());
        List<Message> messages = messageCaptor.getAllValues();
        assertThat(messages).extracting(Message::getRole).containsExactly("system", "assistant");
        assertThat(messages.get(0).getContent()).contains("business partner");
        assertThat(messages.get(0).getContent()).contains("Business fair partner meeting");
        assertThat(messages.get(0).getContent()).contains("potential partner");
        assertThat(messages.get(1).getContent()).isEqualTo("您好，很高兴认识您。您想介绍什么产品？");
        assertThat(messages.get(1).getAudioPath()).isEqualTo("trade-fair.mp3");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LlmClient.LlmMessage>> llmCaptor = ArgumentCaptor.forClass(List.class);
        verify(llm).chat(llmCaptor.capture());
        assertThat(llmCaptor.getValue().get(1).content()).contains("Business fair partner meeting");
        assertThat(llmCaptor.getValue().get(1).content()).contains("potential partner");
        assertThat(llmCaptor.getValue())
            .extracting(LlmClient.LlmMessage::content)
            .allSatisfy(content -> assertThat(content).doesNotContainIgnoringCase("restaurant"));
    }

    @Test
    void createConversation_givenHskLevel_thenUsesExamPlannerAndCapsVocabulary() {
        ConversationRepository convRepo = mock(ConversationRepository.class);
        MessageRepository msgRepo = mock(MessageRepository.class);
        LlmClient llm = mock(LlmClient.class);
        TtsService tts = mock(TtsService.class);
        ConversationService service = new ConversationServiceImpl(
            convRepo, msgRepo, llm, tts, mock(PronunciationService.class), new ObjectMapper()
        );
        when(convRepo.save(any(Conversation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(msgRepo.save(any(Message.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(llm.chat(any())).thenReturn("""
            {"systemContext":"Act as an HSKK examiner for this lesson.",
             "openingMessage":"你好！你叫什么名字？"}
            """);
        when(tts.synthesize(any(), anyString())).thenReturn("hsk.mp3");

        service.createConversation(
            USER_ID,
            new CreateConversationRequest("HSK 2 · Bài 2", "Lesson focus on greetings.", 2)
        );

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LlmClient.LlmMessage>> llmCaptor = ArgumentCaptor.forClass(List.class);
        verify(llm).chat(llmCaptor.capture());
        List<LlmClient.LlmMessage> planner = llmCaptor.getValue();
        // Uses the HSK speaking-exam planner and passes the target level to it.
        assertThat(planner.get(0).content()).contains("HSKK");
        assertThat(planner.get(1).content()).contains("HSK 2");

        // The stored system context carries the level ceiling so later turns stay on-level.
        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        verify(msgRepo, org.mockito.Mockito.times(2)).save(messageCaptor.capture());
        String systemContext = messageCaptor.getAllValues().get(0).getContent();
        assertThat(systemContext).contains("HSK 2");
        assertThat(systemContext).containsIgnoringCase("ceiling");
    }

    @Test
    void createConversation_givenMissingRequest_thenDoesNotFallBackToRestaurant() {
        ConversationService service = new ConversationServiceImpl(
            mock(ConversationRepository.class),
            mock(MessageRepository.class),
            mock(LlmClient.class),
            mock(TtsService.class),
            mock(PronunciationService.class),
            new ObjectMapper()
        );

        assertThatThrownBy(() -> service.createConversation(USER_ID, null))
            .isInstanceOf(ApiException.class)
            .extracting("status")
            .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void listMessages_hidesSystemContextFromClient() {
        ConversationRepository convRepo = mock(ConversationRepository.class);
        MessageRepository msgRepo = mock(MessageRepository.class);
        TtsService tts = mock(TtsService.class);
        ConversationService service = new ConversationServiceImpl(
            convRepo, msgRepo, mock(LlmClient.class), tts, mock(PronunciationService.class),
            new ObjectMapper()
        );
        Conversation conversation = new Conversation(
            UUID.randomUUID(),
            USER_ID,
            "Hotel check-in",
            Instant.parse("2026-01-01T00:00:00Z"),
            Instant.parse("2026-01-01T00:00:00Z")
        );
        when(convRepo.findByIdAndUserId(conversation.getId(), USER_ID)).thenReturn(Optional.of(conversation));
        when(msgRepo.findByConversationOrderByCreatedAtAsc(conversation)).thenReturn(List.of(
            new Message(UUID.randomUUID(), conversation, "system", "private scenario", null, Instant.parse("2026-01-01T00:00:00Z")),
            new Message(UUID.randomUUID(), conversation, "assistant", "您好！", null, Instant.parse("2026-01-01T00:00:01Z")),
            new Message(UUID.randomUUID(), conversation, "user", "你好", null, Instant.parse("2026-01-01T00:00:02Z"))
        ));
        when(tts.synthesize(eq("您好！"), anyString())).thenReturn("recovered.mp3");

        List<MessageDto> messages = service.listMessages(USER_ID, conversation.getId());

        assertThat(messages).extracting(MessageDto::role).containsExactly("assistant", "user");
        assertThat(messages).extracting(MessageDto::content).doesNotContain("private scenario");
        assertThat(messages.get(0).audioUrl()).isEqualTo("/api/audio/recovered.mp3");
    }

    @Test
    void sendMessage_givenConversation_thenSavesUserAndAssistantMessages() {
        ConversationRepository convRepo = mock(ConversationRepository.class);
        MessageRepository msgRepo = mock(MessageRepository.class);
        LlmClient llm = mock(LlmClient.class);
        TtsService tts = mock(TtsService.class);
        ConversationService service = new ConversationServiceImpl(
            convRepo, msgRepo, llm, tts, mock(PronunciationService.class), new ObjectMapper()
        );
        Conversation conversation = new Conversation(
            UUID.randomUUID(),
            USER_ID,
            "New conversation",
            Instant.parse("2026-01-01T00:00:00Z"),
            Instant.parse("2026-01-01T00:00:00Z")
        );
        List<Message> savedMessages = new ArrayList<>();
        when(convRepo.findByIdAndUserId(conversation.getId(), USER_ID)).thenReturn(Optional.of(conversation));
        when(msgRepo.save(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            savedMessages.add(message);
            return message;
        });
        when(msgRepo.findByConversationOrderByCreatedAtAsc(conversation))
            .thenAnswer(invocation -> List.copyOf(savedMessages));
        when(llm.chat(any())).thenReturn("你好！你今天想聊什么？");
        when(tts.synthesize(eq("你好！你今天想聊什么？"), anyString())).thenReturn("abc.mp3");

        ChatResponse response = service.sendMessage(USER_ID, conversation.getId(), "你好");

        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        verify(msgRepo, org.mockito.Mockito.times(2)).save(messageCaptor.capture());
        List<Message> capturedMessages = messageCaptor.getAllValues();
        assertThat(capturedMessages).extracting(Message::getRole).containsExactly("user", "assistant");
        assertThat(capturedMessages).extracting(Message::getContent)
            .containsExactly("你好", "你好！你今天想聊什么？");
        assertThat(capturedMessages.get(1).getAudioPath()).isEqualTo("abc.mp3");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LlmClient.LlmMessage>> llmMessagesCaptor = ArgumentCaptor.forClass(List.class);
        verify(llm).chat(llmMessagesCaptor.capture());
        assertThat(llmMessagesCaptor.getValue()).extracting(LlmClient.LlmMessage::role)
            .containsExactly("system", "user");
        assertThat(llmMessagesCaptor.getValue().get(1).content()).isEqualTo("你好");

        assertThat(response.userMessage().role()).isEqualTo("user");
        assertThat(response.assistantMessage().role()).isEqualTo("assistant");
        assertThat(response.assistantMessage().audioUrl()).isEqualTo("/api/audio/abc.mp3");
        verify(convRepo).save(conversation);
    }

    @Test
    void sendMessage_givenTtsReturnsNull_thenSavesAssistantWithoutAudioPath() {
        ConversationRepository convRepo = mock(ConversationRepository.class);
        MessageRepository msgRepo = mock(MessageRepository.class);
        LlmClient llm = mock(LlmClient.class);
        TtsService tts = mock(TtsService.class);
        ConversationService service = new ConversationServiceImpl(
            convRepo, msgRepo, llm, tts, mock(PronunciationService.class), new ObjectMapper()
        );
        Conversation conversation = new Conversation(
            UUID.randomUUID(),
            USER_ID,
            "New conversation",
            Instant.parse("2026-01-01T00:00:00Z"),
            Instant.parse("2026-01-01T00:00:00Z")
        );
        List<Message> savedMessages = new ArrayList<>();
        when(convRepo.findByIdAndUserId(conversation.getId(), USER_ID)).thenReturn(Optional.of(conversation));
        when(msgRepo.save(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            savedMessages.add(message);
            return message;
        });
        when(msgRepo.findByConversationOrderByCreatedAtAsc(conversation))
            .thenAnswer(invocation -> List.copyOf(savedMessages));
        when(llm.chat(any())).thenReturn("你好！");
        when(tts.synthesize(eq("你好！"), anyString())).thenReturn(null);

        ChatResponse response = service.sendMessage(USER_ID, conversation.getId(), "你好");

        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        verify(msgRepo, org.mockito.Mockito.times(2)).save(messageCaptor.capture());
        Message assistant = messageCaptor.getAllValues().get(1);
        assertThat(assistant.getAudioPath()).isNull();
        assertThat(response.assistantMessage().audioUrl()).isNull();
    }

    @Test
    void sendMessage_givenMissingConversation_thenThrowsApiException() {
        ConversationRepository convRepo = mock(ConversationRepository.class);
        MessageRepository msgRepo = mock(MessageRepository.class);
        LlmClient llm = mock(LlmClient.class);
        TtsService tts = mock(TtsService.class);
        ConversationService service = new ConversationServiceImpl(
            convRepo, msgRepo, llm, tts, mock(PronunciationService.class), new ObjectMapper()
        );
        UUID conversationId = UUID.randomUUID();
        when(convRepo.findByIdAndUserId(conversationId, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.sendMessage(USER_ID, conversationId, "你好"))
            .isInstanceOf(ApiException.class)
            .extracting("status")
            .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void sendMessage_givenConversationOwnedByAnotherUser_thenThrowsNotFound() {
        ConversationRepository convRepo = mock(ConversationRepository.class);
        MessageRepository msgRepo = mock(MessageRepository.class);
        LlmClient llm = mock(LlmClient.class);
        TtsService tts = mock(TtsService.class);
        ConversationService service = new ConversationServiceImpl(
            convRepo, msgRepo, llm, tts, mock(PronunciationService.class), new ObjectMapper()
        );

        // A conversation owned by user A...
        UUID ownerId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();
        // ...is invisible to user B: the scoped finder returns empty for B's id.
        when(convRepo.findByIdAndUserId(conversationId, otherUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.sendMessage(otherUserId, conversationId, "你好"))
            .isInstanceOf(ApiException.class)
            .extracting("status")
            .isEqualTo(HttpStatus.NOT_FOUND);

        // It is never read without the user filter.
        verify(convRepo, org.mockito.Mockito.never()).findById(conversationId);
        assertThat(ownerId).isNotEqualTo(otherUserId);
    }

    @Test
    void sendVoiceTurn_givenRecognizedSpeech_thenReturnsScoresAndConversationReply() {
        ConversationRepository convRepo = mock(ConversationRepository.class);
        MessageRepository msgRepo = mock(MessageRepository.class);
        LlmClient llm = mock(LlmClient.class);
        TtsService tts = mock(TtsService.class);
        PronunciationService pronunciation = mock(PronunciationService.class);
        ConversationService service = new ConversationServiceImpl(
            convRepo, msgRepo, llm, tts, pronunciation, new ObjectMapper()
        );
        Conversation conversation = new Conversation(
            UUID.randomUUID(),
            USER_ID,
            "New conversation",
            Instant.parse("2026-01-01T00:00:00Z"),
            Instant.parse("2026-01-01T00:00:00Z")
        );
        List<Message> savedMessages = new ArrayList<>();
        MockMultipartFile audio = new MockMultipartFile(
            "audio", "voice-turn.webm", "audio/webm", new byte[]{1, 2, 3}
        );
        PronunciationResponse assessment = new PronunciationResponse(
            UUID.randomUUID(),
            "我想喝一杯咖啡。",
            "我想喝一杯咖啡。",
            91,
            86,
            null,
            null,
            89,
            false,
            "zh",
            List.of(),
            Instant.parse("2026-01-01T00:00:00Z")
        );

        when(convRepo.findByIdAndUserId(conversation.getId(), USER_ID)).thenReturn(Optional.of(conversation));
        when(pronunciation.assessUnscripted(eq(USER_ID), eq(audio), anyString())).thenReturn(assessment);
        when(msgRepo.save(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            savedMessages.add(message);
            return message;
        });
        when(msgRepo.findByConversationOrderByCreatedAtAsc(conversation))
            .thenAnswer(invocation -> List.copyOf(savedMessages));
        when(llm.chat(any())).thenReturn("""
            {"reply":"有的，您想要热的还是冰的？","contextScore":96,"grammarScore":93,
             "feedback":"Câu trả lời đúng ngữ cảnh và tự nhiên.","suggestedReply":""}
            """);
        when(tts.synthesize(eq("有的，您想要热的还是冰的？"), anyString())).thenReturn("voice.mp3");

        VoiceTurnResponse response = service.sendVoiceTurn(USER_ID, conversation.getId(), audio);

        assertThat(response.userMessage().content()).isEqualTo("我想喝一杯咖啡。");
        assertThat(response.assistantMessage().content()).isEqualTo("有的，您想要热的还是冰的？");
        assertThat(response.assistantMessage().audioUrl()).isEqualTo("/api/audio/voice.mp3");
        assertThat(response.pronunciation().pronScore()).isEqualTo(89);
        assertThat(response.contextScore()).isEqualTo(96);
        assertThat(response.grammarScore()).isEqualTo(93);
        assertThat(response.feedback()).contains("đúng ngữ cảnh");
        verify(pronunciation).assessUnscripted(eq(USER_ID), eq(audio), anyString());
        verify(convRepo).save(conversation);
    }

    @Test
    void sendVoiceTurn_givenMalformedAssessmentJson_thenKeepsConversationWorking() {
        ConversationRepository convRepo = mock(ConversationRepository.class);
        MessageRepository msgRepo = mock(MessageRepository.class);
        LlmClient llm = mock(LlmClient.class);
        TtsService tts = mock(TtsService.class);
        PronunciationService pronunciation = mock(PronunciationService.class);
        ConversationService service = new ConversationServiceImpl(
            convRepo, msgRepo, llm, tts, pronunciation, new ObjectMapper()
        );
        Conversation conversation = new Conversation(
            UUID.randomUUID(),
            USER_ID,
            "Tea practice",
            Instant.parse("2026-01-01T00:00:00Z"),
            Instant.parse("2026-01-01T00:00:00Z")
        );
        MockMultipartFile audio = new MockMultipartFile(
            "audio", "voice-turn.webm", "audio/webm", new byte[]{1, 2, 3}
        );
        PronunciationResponse assessment = new PronunciationResponse(
            UUID.randomUUID(), "我要一杯茶。", "我要一杯茶。", 90, 88, null, null, 89,
            false, "zh", List.of(), Instant.parse("2026-01-01T00:00:00Z")
        );

        when(convRepo.findByIdAndUserId(conversation.getId(), USER_ID)).thenReturn(Optional.of(conversation));
        when(pronunciation.assessUnscripted(eq(USER_ID), eq(audio), anyString())).thenReturn(assessment);
        when(msgRepo.save(any(Message.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(msgRepo.findByConversationOrderByCreatedAtAsc(conversation))
            .thenReturn(List.of(new Message(
                UUID.randomUUID(), conversation, "user", "我要一杯茶。", null, Instant.now()
            )));
        when(llm.chat(any())).thenReturn(
            "{\"reply\":\"好的，请稍等。\",\"contextScore\":95,\"grammarScore\":"
        );
        when(tts.synthesize(eq("好的，请稍等。"), anyString())).thenReturn("fallback.mp3");

        VoiceTurnResponse response = service.sendVoiceTurn(USER_ID, conversation.getId(), audio);

        assertThat(response.assistantMessage().content()).isEqualTo("好的，请稍等。");
        assertThat(response.assistantMessage().audioUrl()).isEqualTo("/api/audio/fallback.mp3");
        assertThat(response.contextScore()).isEqualTo(70);
    }
}
