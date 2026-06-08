package com.chineseapp.service;

import com.chineseapp.dto.auth.AuthResponse;
import com.chineseapp.entity.User;
import com.chineseapp.exception.ApiException;
import com.chineseapp.repository.UserRepository;
import com.chineseapp.security.GoogleProfile;
import com.chineseapp.security.GoogleTokenVerifier;
import com.chineseapp.security.JwtService;
import com.chineseapp.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceImplTest {

    private final GoogleTokenVerifier verifier = mock(GoogleTokenVerifier.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final UserRepository userRepo = mock(UserRepository.class);
    private final AuthServiceImpl service = new AuthServiceImpl(verifier, jwtService, userRepo);

    @Test
    void loginWithGoogle_givenNewUser_thenSavesUserAndReturnsToken() {
        GoogleProfile profile = new GoogleProfile("google-sub-1", "new@example.com", "New User");
        when(verifier.verify("id-token")).thenReturn(Optional.of(profile));
        when(userRepo.findByGoogleSub("google-sub-1")).thenReturn(Optional.empty());
        when(userRepo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.issue(any(User.class))).thenReturn("app-jwt");

        AuthResponse response = service.loginWithGoogle("id-token");

        verify(userRepo).save(any(User.class));
        assertThat(response.token()).isEqualTo("app-jwt");
        assertThat(response.user().email()).isEqualTo("new@example.com");
    }

    @Test
    void loginWithGoogle_givenExistingUser_thenDoesNotSaveAndReturnsToken() {
        User existing = new User(UUID.randomUUID(), "existing@example.com", "google-sub-2",
            "Existing User", Instant.now());
        when(verifier.verify("id-token")).thenReturn(
            Optional.of(new GoogleProfile("google-sub-2", "existing@example.com", "Existing User")));
        when(userRepo.findByGoogleSub("google-sub-2")).thenReturn(Optional.of(existing));
        when(jwtService.issue(existing)).thenReturn("app-jwt");

        AuthResponse response = service.loginWithGoogle("id-token");

        verify(userRepo, never()).save(any(User.class));
        assertThat(response.token()).isEqualTo("app-jwt");
        assertThat(response.user().id()).isEqualTo(existing.getId());
    }

    @Test
    void loginWithGoogle_givenInvalidToken_thenThrowsUnauthorized() {
        when(verifier.verify("bad-token")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.loginWithGoogle("bad-token"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus())
                .isEqualTo(org.springframework.http.HttpStatus.UNAUTHORIZED));

        verify(userRepo, never()).save(any(User.class));
    }

    @Test
    void loginWithMock_givenValidCredentialsAndNewUser_thenSavesUserAndReturnsToken() {
        when(userRepo.findByGoogleSub("mock:mocktest")).thenReturn(Optional.empty());
        when(userRepo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.issue(any(User.class))).thenReturn("app-jwt");

        AuthResponse response = service.loginWithMock(" MOCKTEST@example.com ", "mocktest123");

        verify(userRepo).save(any(User.class));
        assertThat(response.token()).isEqualTo("app-jwt");
        assertThat(response.user().email()).isEqualTo("mocktest@example.com");
        assertThat(response.user().displayName()).isEqualTo("Mock Test");
    }

    @Test
    void loginWithMock_givenExistingUser_thenDoesNotSaveAndReturnsToken() {
        User existing = new User(UUID.randomUUID(), "mocktest@example.com", "mock:mocktest",
            "Mock Test", Instant.now());
        when(userRepo.findByGoogleSub("mock:mocktest")).thenReturn(Optional.of(existing));
        when(jwtService.issue(existing)).thenReturn("app-jwt");

        AuthResponse response = service.loginWithMock("mocktest@example.com", "mocktest123");

        verify(userRepo, never()).save(any(User.class));
        assertThat(response.token()).isEqualTo("app-jwt");
        assertThat(response.user().id()).isEqualTo(existing.getId());
    }

    @Test
    void loginWithMock_givenInvalidCredentials_thenThrowsUnauthorized() {
        assertThatThrownBy(() -> service.loginWithMock("mocktest@example.com", "wrong-password"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus())
                .isEqualTo(org.springframework.http.HttpStatus.UNAUTHORIZED));

        verify(userRepo, never()).findByGoogleSub("mock:mocktest");
        verify(userRepo, never()).save(any(User.class));
    }

    @Test
    void me_givenUnknownUserId_thenThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(userRepo.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.me(id))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND));
    }

    @Test
    void me_givenKnownUserId_thenReturnsUserDto() {
        User user = new User(UUID.randomUUID(), "me@example.com", "google-sub-3", "Me", Instant.now());
        when(userRepo.findById(user.getId())).thenReturn(Optional.of(user));

        assertThat(service.me(user.getId()).email()).isEqualTo("me@example.com");
    }
}
