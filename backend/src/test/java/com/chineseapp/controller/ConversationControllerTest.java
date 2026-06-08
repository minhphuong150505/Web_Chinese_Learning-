package com.chineseapp.controller;

import com.chineseapp.config.SecurityConfig;
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
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ConversationController.class)
@Import({GlobalExceptionHandler.class, SecurityConfig.class, JwtAuthFilter.class})
class ConversationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ConversationService service;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

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
}
