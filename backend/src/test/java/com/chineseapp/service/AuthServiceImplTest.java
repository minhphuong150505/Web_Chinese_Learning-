package com.chineseapp.service;

import com.chineseapp.config.AuthProperties;
import com.chineseapp.dto.auth.AuthResponse;
import com.chineseapp.entity.User;
import com.chineseapp.exception.ApiException;
import com.chineseapp.repository.UserRepository;
import com.chineseapp.security.GoogleProfile;
import com.chineseapp.security.GoogleTokenVerifier;
import com.chineseapp.security.JwtService;
import com.chineseapp.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

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
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final AuthProperties authProperties = new AuthProperties();
    private final AuthServiceImpl service = new AuthServiceImpl(
        verifier, jwtService, userRepo, passwordEncoder, authProperties
    );

    @Test
    void loginWithGoogle_givenNewUser_thenSavesUserAndReturnsToken() {
        GoogleProfile profile = new GoogleProfile("google-sub-1", "new@example.com", "New User");
        when(verifier.verify("id-token")).thenReturn(Optional.of(profile));
        when(userRepo.findByGoogleSub("google-sub-1")).thenReturn(Optional.empty());
        when(userRepo.findByEmail("new@example.com")).thenReturn(Optional.empty());
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
    void loginWithGoogle_givenCredentialUserWithSameEmail_thenLinksGoogleAccount() {
        User existing = new User(
            UUID.randomUUID(), "linked@example.com", null, "password-hash", "Linked User", Instant.now()
        );
        GoogleProfile profile = new GoogleProfile("google-sub-linked", "LINKED@example.com", "Linked User");
        when(verifier.verify("id-token")).thenReturn(Optional.of(profile));
        when(userRepo.findByGoogleSub("google-sub-linked")).thenReturn(Optional.empty());
        when(userRepo.findByEmail("linked@example.com")).thenReturn(Optional.of(existing));
        when(userRepo.save(existing)).thenReturn(existing);
        when(jwtService.issue(existing)).thenReturn("app-jwt");

        AuthResponse response = service.loginWithGoogle("id-token");

        verify(userRepo).save(existing);
        assertThat(existing.getGoogleSub()).isEqualTo("google-sub-linked");
        assertThat(response.token()).isEqualTo("app-jwt");
    }

    @Test
    void loginWithGoogle_givenEmailLinkedToDifferentGoogleAccount_thenThrowsConflict() {
        User existing = new User(
            UUID.randomUUID(), "linked@example.com", "different-google-sub", "Linked User", Instant.now()
        );
        GoogleProfile profile = new GoogleProfile("google-sub-linked", "linked@example.com", "Linked User");
        when(verifier.verify("id-token")).thenReturn(Optional.of(profile));
        when(userRepo.findByGoogleSub("google-sub-linked")).thenReturn(Optional.empty());
        when(userRepo.findByEmail("linked@example.com")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.loginWithGoogle("id-token"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus())
                .isEqualTo(org.springframework.http.HttpStatus.CONFLICT));

        verify(userRepo, never()).save(any(User.class));
    }

    @Test
    void login_givenValidCredentials_thenReturnsToken() {
        User existing = new User(
            UUID.randomUUID(), "member@example.com", null, "password-hash", "Member", Instant.now()
        );
        when(userRepo.findByEmail("member@example.com")).thenReturn(Optional.of(existing));
        when(passwordEncoder.matches("secret123", "password-hash")).thenReturn(true);
        when(jwtService.issue(existing)).thenReturn("app-jwt");

        AuthResponse response = service.login(" MEMBER@example.com ", "secret123");

        verify(userRepo, never()).save(any(User.class));
        assertThat(response.token()).isEqualTo("app-jwt");
        assertThat(response.user().id()).isEqualTo(existing.getId());
    }

    @Test
    void login_givenInvalidCredentials_thenThrowsUnauthorized() {
        when(userRepo.findByEmail("member@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login("member@example.com", "wrong-password"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus())
                .isEqualTo(org.springframework.http.HttpStatus.UNAUTHORIZED));

        verify(userRepo, never()).save(any(User.class));
    }

    @Test
    void login_givenSingleUserEnabledAndMatchingCredentials_thenCreatesPrivateUser() {
        authProperties.getSingleUser().setEnabled(true);
        authProperties.getSingleUser().setUsername("privatelearner");
        authProperties.getSingleUser().setPassword("private-password");
        authProperties.getSingleUser().setDisplayName("Private Learner");
        when(userRepo.findByEmail("privatelearner")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("private-password")).thenReturn("password-hash");
        when(userRepo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.issue(any(User.class))).thenReturn("app-jwt");

        AuthResponse response = service.login(" PrivateLearner ", "private-password");

        assertThat(response.token()).isEqualTo("app-jwt");
        assertThat(response.user().email()).isEqualTo("privatelearner");
        assertThat(response.user().displayName()).isEqualTo("Private Learner");
        verify(passwordEncoder).encode("private-password");
        verify(userRepo).save(any(User.class));
    }

    @Test
    void login_givenExistingSingleUser_thenUsesStoredPasswordHash() {
        authProperties.getSingleUser().setEnabled(true);
        authProperties.getSingleUser().setUsername("privatelearner");
        authProperties.getSingleUser().setPassword("original-config-password");
        User existing = new User(
            UUID.randomUUID(),
            "privatelearner",
            null,
            "changed-password-hash",
            "Private Learner",
            Instant.now()
        );
        when(userRepo.findByEmail("privatelearner")).thenReturn(Optional.of(existing));
        when(passwordEncoder.matches("changed-password", "changed-password-hash")).thenReturn(true);
        when(jwtService.issue(existing)).thenReturn("app-jwt");

        AuthResponse response = service.login("privatelearner", "changed-password");

        assertThat(response.token()).isEqualTo("app-jwt");
        verify(passwordEncoder).matches("changed-password", "changed-password-hash");
        verify(userRepo, never()).save(any(User.class));
    }

    @Test
    void register_givenNewEmail_thenHashesPasswordAndReturnsToken() {
        when(userRepo.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret123")).thenReturn("password-hash");
        when(userRepo.saveAndFlush(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.issue(any(User.class))).thenReturn("app-jwt");

        AuthResponse response = service.register(" New Member ", " NEW@example.com ", "secret123");

        assertThat(response.token()).isEqualTo("app-jwt");
        assertThat(response.user().email()).isEqualTo("new@example.com");
        assertThat(response.user().displayName()).isEqualTo("New Member");
        verify(passwordEncoder).encode("secret123");
    }

    @Test
    void register_givenExistingEmail_thenThrowsConflict() {
        User existing = new User(
            UUID.randomUUID(), "member@example.com", "google-sub", "Member", Instant.now()
        );
        when(userRepo.findByEmail("member@example.com")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.register("Member", "member@example.com", "secret123"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus())
                .isEqualTo(org.springframework.http.HttpStatus.CONFLICT));

        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void register_givenConcurrentDuplicate_thenThrowsConflict() {
        when(userRepo.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret123")).thenReturn("password-hash");
        when(userRepo.saveAndFlush(any(User.class)))
            .thenThrow(new DataIntegrityViolationException("duplicate"));

        assertThatThrownBy(() -> service.register("New", "new@example.com", "secret123"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus())
                .isEqualTo(org.springframework.http.HttpStatus.CONFLICT));
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
