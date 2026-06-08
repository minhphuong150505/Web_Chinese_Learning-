package com.chineseapp.service.impl;

import com.chineseapp.dto.auth.AuthResponse;
import com.chineseapp.dto.auth.UserDto;
import com.chineseapp.entity.User;
import com.chineseapp.exception.ApiException;
import com.chineseapp.repository.UserRepository;
import com.chineseapp.security.GoogleProfile;
import com.chineseapp.security.GoogleTokenVerifier;
import com.chineseapp.security.JwtService;
import com.chineseapp.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private static final String MOCK_EMAIL = "mocktest@example.com";
    private static final String MOCK_PASSWORD = "mocktest123";
    private static final String MOCK_GOOGLE_SUB = "mock:mocktest";
    private static final String MOCK_DISPLAY_NAME = "Mock Test";

    private final GoogleTokenVerifier googleVerifier;
    private final JwtService jwtService;
    private final UserRepository userRepo;

    public AuthServiceImpl(GoogleTokenVerifier googleVerifier, JwtService jwtService, UserRepository userRepo) {
        this.googleVerifier = googleVerifier;
        this.jwtService = jwtService;
        this.userRepo = userRepo;
    }

    @Override
    public AuthResponse loginWithGoogle(String idToken) {
        GoogleProfile p = googleVerifier.verify(idToken)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid Google token"));
        User user = userRepo.findByGoogleSub(p.sub())
            .orElseGet(() -> userRepo.save(new User(UUID.randomUUID(), p.email(), p.sub(),
                                                    p.name(), Instant.now())));
        return new AuthResponse(jwtService.issue(user), UserDto.from(user));
    }

    @Override
    public AuthResponse loginWithMock(String email, String password) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (!MOCK_EMAIL.equals(normalizedEmail) || !MOCK_PASSWORD.equals(password)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        User user = userRepo.findByGoogleSub(MOCK_GOOGLE_SUB)
            .orElseGet(() -> userRepo.save(new User(UUID.randomUUID(), MOCK_EMAIL, MOCK_GOOGLE_SUB,
                                                    MOCK_DISPLAY_NAME, Instant.now())));
        return new AuthResponse(jwtService.issue(user), UserDto.from(user));
    }

    @Override
    public UserDto me(UUID userId) {
        return userRepo.findById(userId)
            .map(UserDto::from)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
