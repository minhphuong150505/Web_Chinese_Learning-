package com.chineseapp.service.impl;

import com.chineseapp.entity.User;
import com.chineseapp.exception.ApiException;
import com.chineseapp.repository.MessageRepository;
import com.chineseapp.repository.PronunciationScoreRepository;
import com.chineseapp.repository.UserRepository;
import com.chineseapp.service.AccountService;
import com.chineseapp.service.CorpusAudioStorage;
import com.chineseapp.service.TtsService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@Service
public class AccountServiceImpl implements AccountService {

    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final PronunciationScoreRepository pronunciationScoreRepository;
    private final PasswordEncoder passwordEncoder;
    private final TtsService ttsService;
    private final CorpusAudioStorage corpusAudioStorage;

    public AccountServiceImpl(UserRepository userRepository,
                              MessageRepository messageRepository,
                              PronunciationScoreRepository pronunciationScoreRepository,
                              PasswordEncoder passwordEncoder,
                              TtsService ttsService,
                              CorpusAudioStorage corpusAudioStorage) {
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
        this.pronunciationScoreRepository = pronunciationScoreRepository;
        this.passwordEncoder = passwordEncoder;
        this.ttsService = ttsService;
        this.corpusAudioStorage = corpusAudioStorage;
    }

    @Override
    @Transactional
    public void changePassword(UUID userId, String currentPassword, String newPassword) {
        validatePasswordLength(newPassword);
        User user = getUser(userId);
        verifyCurrentPassword(user, currentPassword);
        user.changePassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void deleteAccount(UUID userId, String currentPassword, String confirmation) {
        if (!"DELETE".equals(confirmation)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Type DELETE to confirm account deletion");
        }

        User user = getUser(userId);
        verifyCurrentPassword(user, currentPassword);

        List<String> ttsAudioPaths = messageRepository.findAudioPathsByUserId(userId);
        List<String> corpusAudioPaths =
            pronunciationScoreRepository.findAudioPathsByUserId(userId);

        userRepository.delete(user);
        userRepository.flush();

        ttsAudioPaths.forEach(ttsService::delete);
        corpusAudioPaths.forEach(corpusAudioStorage::delete);
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void verifyCurrentPassword(User user, String currentPassword) {
        if (user.getPasswordHash() == null) {
            return;
        }
        if (currentPassword == null
            || currentPassword.getBytes(StandardCharsets.UTF_8).length > 72
            || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
    }

    private void validatePasswordLength(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must not exceed 72 bytes");
        }
    }
}
