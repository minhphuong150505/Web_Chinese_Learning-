package com.chineseapp.controller;

import com.chineseapp.config.AuthProperties;
import com.chineseapp.config.CorsConfig;
import com.chineseapp.config.SecurityConfig;
import com.chineseapp.dto.auth.AuthResponse;
import com.chineseapp.dto.auth.UserDto;
import com.chineseapp.exception.GlobalExceptionHandler;
import com.chineseapp.repository.UserRepository;
import com.chineseapp.security.JwtAuthFilter;
import com.chineseapp.security.JwtService;
import com.chineseapp.security.WithMockCurrentUser;
import com.chineseapp.service.AccountService;
import com.chineseapp.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({
    CorsConfig.class,
    GlobalExceptionHandler.class,
    SecurityConfig.class,
    JwtAuthFilter.class,
    ControllerWebMvcTestConfig.class
})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService service;

    @MockBean
    private AccountService accountService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private AuthProperties authProperties;

    @Test
    void login_withoutToken_thenReturnsAuthResponse() throws Exception {
        UserDto user = new UserDto(UUID.randomUUID(), "member@example.com", "Member", true);
        when(service.login("member@example.com", "secret123"))
            .thenReturn(new AuthResponse("app-jwt", user));

        mockMvc.perform(post("/api/auth/login")
                .header("Origin", "https://kanhim0105.com")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"member@example.com","password":"secret123"}
                    """))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "https://kanhim0105.com"))
            .andExpect(jsonPath("$.token").value("app-jwt"))
            .andExpect(jsonPath("$.user.email").value("member@example.com"));
    }

    @Test
    void register_withoutToken_thenReturnsAuthResponse() throws Exception {
        UserDto user = new UserDto(UUID.randomUUID(), "new@example.com", "New Member", true);
        when(service.register("New Member", "new@example.com", "secret123"))
            .thenReturn(new AuthResponse("app-jwt", user));

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "displayName":"New Member",
                      "email":"new@example.com",
                      "password":"secret123"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("app-jwt"))
            .andExpect(jsonPath("$.user.displayName").value("New Member"));
    }

    @Test
    void register_givenShortPassword_thenReturnsValidationError() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "displayName":"New Member",
                      "email":"new@example.com",
                      "password":"short"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));

        verifyNoInteractions(service);
    }

    @Test
    @WithMockCurrentUser
    void changePassword_givenAuthenticatedUser_thenReturnsNoContent() throws Exception {
        mockMvc.perform(patch("/api/auth/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"currentPassword":"old-password","newPassword":"new-password"}
                    """))
            .andExpect(status().isNoContent());

        verify(accountService).changePassword(
            UUID.fromString("00000000-0000-0000-0000-000000000001"),
            "old-password",
            "new-password"
        );
    }

    @Test
    @WithMockCurrentUser
    void deleteAccount_givenAuthenticatedUser_thenReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/auth/account")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"currentPassword":"old-password","confirmation":"DELETE"}
                    """))
            .andExpect(status().isNoContent());

        verify(accountService).deleteAccount(
            UUID.fromString("00000000-0000-0000-0000-000000000001"),
            "old-password",
            "DELETE"
        );
    }

    @Test
    void deleteAccount_withoutToken_thenReturnsUnauthorized() throws Exception {
        mockMvc.perform(delete("/api/auth/account")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"confirmation":"DELETE"}
                    """))
            .andExpect(status().isUnauthorized());

        verifyNoInteractions(accountService);
    }
}
