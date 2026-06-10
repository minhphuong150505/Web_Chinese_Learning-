package com.chineseapp.controller;

import com.chineseapp.config.AuthProperties;
import com.chineseapp.config.LetterProperties;
import com.chineseapp.config.SecurityConfig;
import com.chineseapp.exception.GlobalExceptionHandler;
import com.chineseapp.repository.UserRepository;
import com.chineseapp.security.JwtAuthFilter;
import com.chineseapp.security.JwtService;
import com.chineseapp.security.WithMockCurrentUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(LetterController.class)
@EnableConfigurationProperties(LetterProperties.class)
@Import({
    GlobalExceptionHandler.class,
    SecurityConfig.class,
    JwtAuthFilter.class,
    ControllerWebMvcTestConfig.class
})
@TestPropertySource(properties = "app.letter.allowed-emails=nguoiyeukimhan")
class LetterControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private AuthProperties authProperties;

    @Test
    @WithMockCurrentUser(email = "nguoiyeukimhan", name = "Kim Han")
    void kimHan_givenAllowedUser_thenReturnsLetter() throws Exception {
        mockMvc.perform(get("/api/letter/kim-han"))
            .andExpect(status().isOk())
            .andExpect(content().string(containsString("Gửi Hân")));
    }

    @Test
    @WithMockCurrentUser(email = "other@example.com", name = "Other")
    void kimHan_givenOtherUser_thenReturnsForbidden() throws Exception {
        mockMvc.perform(get("/api/letter/kim-han"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("This letter is private"));
    }
}
