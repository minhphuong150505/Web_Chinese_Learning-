package com.chineseapp.controller;

import com.chineseapp.config.AuthProperties;
import com.chineseapp.config.SecurityConfig;
import com.chineseapp.config.TtsProperties;
import com.chineseapp.exception.GlobalExceptionHandler;
import com.chineseapp.repository.UserRepository;
import com.chineseapp.security.JwtAuthFilter;
import com.chineseapp.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TtsController.class)
@Import({
    GlobalExceptionHandler.class,
    SecurityConfig.class,
    JwtAuthFilter.class,
    ControllerWebMvcTestConfig.class
})
class TtsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TtsProperties props;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private AuthProperties authProperties;

    @TempDir
    private Path tempDir;

    @Test
    void get_givenExistingAudioFile_thenReturnsMpegBytes() throws Exception {
        when(props.getStorageDir()).thenReturn(tempDir.toString());
        Path audio = tempDir.resolve("abc-def.mp3");
        byte[] bytes = new byte[] { 1, 2, 3 };
        Files.write(audio, bytes);

        mockMvc.perform(get("/api/audio/abc-def.mp3"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.valueOf("audio/mpeg")))
            .andExpect(content().bytes(bytes));
    }

    @Test
    void get_givenPathTraversal_thenReturnsBadRequest() throws Exception {
        when(props.getStorageDir()).thenReturn(tempDir.toString());

        // With Spring Security active, the StrictHttpFirewall rejects the encoded-traversal
        // URL with a 400 before it ever reaches the controller's "Invalid filename" guard,
        // so there is no JSON body — only the 400 status. Traversal is still blocked.
        mockMvc.perform(get("/api/audio/{filename}", "../../etc/passwd"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void get_givenMissingAudioFile_thenReturnsNotFound() throws Exception {
        when(props.getStorageDir()).thenReturn(tempDir.toString());

        mockMvc.perform(get("/api/audio/abc-def.mp3"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Audio not found"));
    }
}
