package com.chineseapp.controller;

import com.chineseapp.config.SecurityConfig;
import com.chineseapp.dto.pronunciation.PronunciationResponse;
import com.chineseapp.dto.pronunciation.WordScore;
import com.chineseapp.exception.GlobalExceptionHandler;
import com.chineseapp.repository.UserRepository;
import com.chineseapp.security.JwtAuthFilter;
import com.chineseapp.security.JwtService;
import com.chineseapp.security.WithMockCurrentUser;
import com.chineseapp.service.PronunciationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PronunciationController.class)
@Import({GlobalExceptionHandler.class, SecurityConfig.class, JwtAuthFilter.class})
class PronunciationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PronunciationService service;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @Test
    @WithMockCurrentUser
    void assess_givenMissingAudioField_thenReturnsBadRequest() throws Exception {
        mockMvc.perform(multipart("/api/pronunciation/assess")
                .param("referenceText", "你好世界"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockCurrentUser
    void assess_givenEmptyAudio_thenReturnsBadRequest() throws Exception {
        MockMultipartFile audio = new MockMultipartFile("audio", "recording.webm", "audio/webm", new byte[0]);
        mockMvc.perform(multipart("/api/pronunciation/assess")
                .file(audio)
                .param("referenceText", "你好世界"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Empty audio"));
    }

    @Test
    @WithMockCurrentUser
    void assess_givenValidAudio_thenReturnsAssessment() throws Exception {
        UUID id = UUID.randomUUID();
        PronunciationResponse response = new PronunciationResponse(
            id,
            "你好世界",
            "你好世界",
            90.0,
            88.0,
            100.0,
            74.0,
            89.5,
            true,
            List.of(new WordScore("你好", 92.5, "None", List.of(), List.of())),
            Instant.parse("2026-01-01T00:00:00Z")
        );
        UUID mockUserId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        when(service.assess(eq(mockUserId), any(), eq("你好世界"), anyBoolean())).thenReturn(response);

        MockMultipartFile audio = new MockMultipartFile("audio", "recording.webm", "audio/webm", new byte[]{1, 2, 3});
        mockMvc.perform(multipart("/api/pronunciation/assess")
                .file(audio)
                .param("referenceText", "你好世界"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id.toString()))
            .andExpect(jsonPath("$.accuracy").value(90.0))
            .andExpect(jsonPath("$.words[0].word").value("你好"))
            .andExpect(jsonPath("$.words[0].accuracyScore").value(92.5));
    }

    @Test
    @WithMockCurrentUser
    void history_returnsList() throws Exception {
        UUID mockUserId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        when(service.historyTop20(eq(mockUserId))).thenReturn(List.of());
        mockMvc.perform(get("/api/pronunciation/history"))
            .andExpect(status().isOk());
    }
}
