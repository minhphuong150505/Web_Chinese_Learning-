package com.chineseapp.service.impl;

import com.chineseapp.config.AuthProperties;
import com.chineseapp.dto.auth.AuthResponse;
import com.chineseapp.dto.auth.UserDto;
import com.chineseapp.entity.User;
import com.chineseapp.exception.ApiException;
import com.chineseapp.repository.UserRepository;
import com.chineseapp.security.GoogleProfile;
import com.chineseapp.security.GoogleTokenVerifier;
import com.chineseapp.security.JwtService;
import com.chineseapp.service.AuthService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private final GoogleTokenVerifier googleVerifier;
    private final JwtService jwtService;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuthProperties authProperties;

    public AuthServiceImpl(GoogleTokenVerifier googleVerifier, JwtService jwtService,
                           UserRepository userRepo, PasswordEncoder passwordEncoder,
                           AuthProperties authProperties) {
        this.googleVerifier = googleVerifier;
        this.jwtService = jwtService;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.authProperties = authProperties;
    }

    @Override
    @Transactional
    public AuthResponse loginWithGoogle(String idToken) {
        if (authProperties.getSingleUser().isEnabled()) {
            throw privateAccountOnly();
        }
        GoogleProfile p = googleVerifier.verify(idToken)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid Google token"));
        String normalizedEmail = normalizeEmail(p.email());
        User user = userRepo.findByGoogleSub(p.sub())
            .orElseGet(() -> userRepo.findByEmail(normalizedEmail)
                .map(existing -> {
                    if (existing.getGoogleSub() != null && !existing.getGoogleSub().equals(p.sub())) {
                        throw new ApiException(
                            HttpStatus.CONFLICT,
                            "This email is already linked to another Google account"
                        );
                    }
                    existing.linkGoogleAccount(p.sub());
                    return userRepo.save(existing);
                })
                .orElseGet(() -> userRepo.save(new User(
                    UUID.randomUUID(), normalizedEmail, p.sub(), p.name(), Instant.now()
                ))));
        return authenticate(user);
    }

    @Override
    @Transactional
    public AuthResponse login(String email, String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw invalidCredentials();
        }
        if (authProperties.getSingleUser().isEnabled()) {
            return loginSingleUser(email, password);
        }
        User user = userRepo.findByEmail(normalizeEmail(email))
            .orElseThrow(this::invalidCredentials);
        if (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return authenticate(user);
    }

    @Override
    @Transactional
    public AuthResponse register(String displayName, String email, String password) {
        if (authProperties.getSingleUser().isEnabled()) {
            throw privateAccountOnly();
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must not exceed 72 bytes");
        }
        String normalizedEmail = normalizeEmail(email);
        if (userRepo.findByEmail(normalizedEmail).isPresent()) {
            throw emailAlreadyExists();
        }

        User user = new User(
            UUID.randomUUID(),
            normalizedEmail,
            null,
            passwordEncoder.encode(password),
            displayName.trim(),
            Instant.now()
        );
        try {
            return authenticate(userRepo.saveAndFlush(user));
        } catch (DataIntegrityViolationException ex) {
            throw emailAlreadyExists();
        }
    }

    @Override
    public UserDto me(UUID userId) {
        return userRepo.findById(userId)
            .map(UserDto::from)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private AuthResponse authenticate(User user) {
        return new AuthResponse(jwtService.issue(user), UserDto.from(user));
    }

    private AuthResponse loginSingleUser(String username, String password) {
        AuthProperties.SingleUser singleUser = authProperties.getSingleUser();
        String expectedUsername = normalizeEmail(singleUser.getUsername());
        String expectedPassword = singleUser.getPassword();
        if (expectedUsername.isBlank() || expectedPassword.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Private account is not configured");
        }
        if (!normalizeEmail(username).equals(expectedUsername) || !constantTimeEquals(password, expectedPassword)) {
            throw invalidCredentials();
        }

        User user = userRepo.findByEmail(expectedUsername)
            .orElseGet(() -> userRepo.save(new User(
                UUID.randomUUID(),
                expectedUsername,
                null,
                passwordEncoder.encode(expectedPassword),
                singleUser.getDisplayName().trim(),
                Instant.now()
            )));
        return authenticate(user);
    }

    private boolean constantTimeEquals(String actual, String expected) {
        return MessageDigest.isEqual(
            actual.getBytes(StandardCharsets.UTF_8),
            expected.getBytes(StandardCharsets.UTF_8)
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    private ApiException emailAlreadyExists() {
        return new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
    }

    private ApiException privateAccountOnly() {
        return new ApiException(HttpStatus.FORBIDDEN, "Only the private account can sign in");
    }
}
