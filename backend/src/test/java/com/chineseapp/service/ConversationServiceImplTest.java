package com.chineseapp.service;

import com.chineseapp.client.LlmClient;
import com.chineseapp.dto.chat.ChatResponse;
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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ConversationServiceImplTest {

    private static final UUID USER_ID = UUID.randomUUID();

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
        when(tts.synthesize("你好！你今天想聊什么？")).thenReturn("abc.mp3");

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
        when(tts.synthesize("你好！")).thenReturn(null);

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
            List.of(),
            Instant.parse("2026-01-01T00:00:00Z")
        );

        when(convRepo.findByIdAndUserId(conversation.getId(), USER_ID)).thenReturn(Optional.of(conversation));
        when(pronunciation.assessUnscripted(USER_ID, audio)).thenReturn(assessment);
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
        when(tts.synthesize("有的，您想要热的还是冰的？")).thenReturn("voice.mp3");

        VoiceTurnResponse response = service.sendVoiceTurn(USER_ID, conversation.getId(), audio);

        assertThat(response.userMessage().content()).isEqualTo("我想喝一杯咖啡。");
        assertThat(response.assistantMessage().content()).isEqualTo("有的，您想要热的还是冰的？");
        assertThat(response.assistantMessage().audioUrl()).isEqualTo("/api/audio/voice.mp3");
        assertThat(response.pronunciation().pronScore()).isEqualTo(89);
        assertThat(response.contextScore()).isEqualTo(96);
        assertThat(response.grammarScore()).isEqualTo(93);
        assertThat(response.feedback()).contains("đúng ngữ cảnh");
        verify(pronunciation).assessUnscripted(USER_ID, audio);
        verify(convRepo).save(conversation);
    }
}
