package com.chineseapp.controller;

import com.chineseapp.config.AuthProperties;
import com.chineseapp.config.SecurityConfig;
import com.chineseapp.dto.chat.ConversationDto;
import com.chineseapp.dto.chat.MessageDto;
import com.chineseapp.dto.chat.VoiceTurnResponse;
import com.chineseapp.dto.pronunciation.PronunciationResponse;
import com.chineseapp.exception.ApiException;
import com.chineseapp.exception.GlobalExceptionHandler;
import com.chineseapp.repository.UserRepository;
import com.chineseapp.security.JwtAuthFilter;
import com.chineseapp.security.JwtService;
import com.chineseapp.security.WithMockCurrentUser;
import com.chineseapp.service.ConversationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ConversationController.class)
@Import({
    GlobalExceptionHandler.class,
    SecurityConfig.class,
    JwtAuthFilter.class,
    ControllerWebMvcTestConfig.class
})
class ConversationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ConversationService service;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private AuthProperties authProperties;

    @Test
    @WithMockCurrentUser
    void create_givenScenario_thenReturnsConversation() throws Exception {
        UUID mockUserId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        when(service.createConversation(eq(mockUserId), any()))
            .thenReturn(new ConversationDto(UUID.randomUUID(), "Hotel check-in", "zh", now, now));

        mockMvc.perform(post("/api/conversations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"topicTitle":"Hotel","scenario":"Practice checking in and asking about breakfast."}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("Hotel check-in"));

        verify(service).createConversation(
            eq(mockUserId),
            argThat(request ->
                request.topicTitle().equals("Hotel")
                    && request.scenario().contains("checking in")
            )
        );
    }

    @Test
    @WithMockCurrentUser
    void create_givenBlankTopic_thenReturnsValidationFailed() throws Exception {
        mockMvc.perform(post("/api/conversations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"topicTitle":"","scenario":"Practice checking in at a hotel."}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));

        verifyNoInteractions(service);
    }

    @Test
    @WithMockCurrentUser
    void send_givenEmptyContent_thenReturnsValidationFailed() throws Exception {
        UUID conversationId = UUID.randomUUID();

        mockMvc.perform(post("/api/conversations/{id}/messages", conversationId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));

        verifyNoInteractions(service);
    }

    @Test
    @WithMockCurrentUser
    void send_givenMissingConversation_thenReturnsNotFound() throws Exception {
        UUID conversationId = UUID.randomUUID();
        // The id from @WithMockCurrentUser is forwarded as the first (userId) arg.
        UUID mockUserId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        when(service.sendMessage(eq(mockUserId), eq(conversationId), eq("hello")))
            .thenThrow(new ApiException(HttpStatus.NOT_FOUND, "Conversation not found"));

        mockMvc.perform(post("/api/conversations/{id}/messages", conversationId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"hello\"}"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error").value("NOT_FOUND"))
            .andExpect(jsonPath("$.message").value("Conversation not found"));
    }

    @Test
    @WithMockCurrentUser
    void voiceTurn_givenEmptyAudio_thenReturnsBadRequest() throws Exception {
        UUID conversationId = UUID.randomUUID();
        MockMultipartFile audio = new MockMultipartFile(
            "audio", "voice-turn.webm", "audio/webm", new byte[0]
        );

        mockMvc.perform(multipart("/api/conversations/{id}/voice-turn", conversationId).file(audio))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Empty audio"));
    }

    @Test
    @WithMockCurrentUser
    void voiceTurn_givenAudio_thenReturnsAssessmentAndReply() throws Exception {
        UUID conversationId = UUID.randomUUID();
        UUID mockUserId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        VoiceTurnResponse response = new VoiceTurnResponse(
            new MessageDto(UUID.randomUUID(), "user", "我要一杯茶。", null, now),
            new MessageDto(UUID.randomUUID(), "assistant", "好的，您要热茶吗？", "/api/audio/reply.mp3", now),
            new PronunciationResponse(
                UUID.randomUUID(), "我要一杯茶。", "我要一杯茶。",
                90, 88, null, null, 89, false, "zh", List.of(), now
            ),
            95,
            92,
            "Đúng ngữ cảnh.",
            ""
        );
        when(service.sendVoiceTurn(eq(mockUserId), eq(conversationId), any())).thenReturn(response);
        MockMultipartFile audio = new MockMultipartFile(
            "audio", "voice-turn.webm", "audio/webm", new byte[]{1, 2, 3}
        );

        mockMvc.perform(multipart("/api/conversations/{id}/voice-turn", conversationId).file(audio))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.userMessage.content").value("我要一杯茶。"))
            .andExpect(jsonPath("$.assistantMessage.content").value("好的，您要热茶吗？"))
            .andExpect(jsonPath("$.pronunciation.pronScore").value(89))
            .andExpect(jsonPath("$.contextScore").value(95))
            .andExpect(jsonPath("$.grammarScore").value(92));
    }
}
