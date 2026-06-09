package com.chineseapp.service;

import com.chineseapp.entity.User;
import com.chineseapp.exception.ApiException;
import com.chineseapp.repository.MessageRepository;
import com.chineseapp.repository.PronunciationScoreRepository;
import com.chineseapp.repository.UserRepository;
import com.chineseapp.service.impl.AccountServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AccountServiceImplTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final MessageRepository messageRepository = mock(MessageRepository.class);
    private final PronunciationScoreRepository pronunciationScoreRepository =
        mock(PronunciationScoreRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final TtsService ttsService = mock(TtsService.class);
    private final CorpusAudioStorage corpusAudioStorage = mock(CorpusAudioStorage.class);
    private final AccountService service = new AccountServiceImpl(
        userRepository,
        messageRepository,
        pronunciationScoreRepository,
        passwordEncoder,
        ttsService,
        corpusAudioStorage
    );

    @Test
    void changePassword_givenPasswordAccount_thenVerifiesAndStoresNewHash() {
        User user = passwordUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("old-password", "old-hash")).thenReturn(true);
        when(passwordEncoder.encode("new-password")).thenReturn("new-hash");

        service.changePassword(user.getId(), "old-password", "new-password");

        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        verify(userRepository).save(user);
    }

    @Test
    void changePassword_givenGoogleOnlyAccount_thenSetsPasswordWithoutCurrentPassword() {
        User user = new User(
            UUID.randomUUID(), "google@example.com", "google-sub", "Google User", Instant.now()
        );
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("new-password")).thenReturn("new-hash");

        service.changePassword(user.getId(), null, "new-password");

        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        verify(passwordEncoder, never()).matches(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void changePassword_givenIncorrectCurrentPassword_thenRejectsRequest() {
        User user = passwordUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", "old-hash")).thenReturn(false);

        assertThatThrownBy(
            () -> service.changePassword(user.getId(), "wrong-password", "new-password")
        )
            .isInstanceOf(ApiException.class)
            .hasMessage("Current password is incorrect");

        verify(userRepository, never()).save(user);
    }

    @Test
    void deleteAccount_givenValidConfirmation_thenDeletesUserAndAudio() {
        User user = passwordUser();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("old-password", "old-hash")).thenReturn(true);
        when(messageRepository.findAudioPathsByUserId(user.getId()))
            .thenReturn(List.of("first.mp3", "second.mp3"));
        when(pronunciationScoreRepository.findAudioPathsByUserId(user.getId()))
            .thenReturn(List.of("2026-06/recording.wav"));

        service.deleteAccount(user.getId(), "old-password", "DELETE");

        verify(userRepository).delete(user);
        verify(userRepository).flush();
        verify(ttsService).delete("first.mp3");
        verify(ttsService).delete("second.mp3");
        verify(corpusAudioStorage).delete("2026-06/recording.wav");
    }

    @Test
    void deleteAccount_givenMissingConfirmation_thenDoesNotDelete() {
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> service.deleteAccount(userId, null, "delete"))
            .isInstanceOf(ApiException.class)
            .hasMessage("Type DELETE to confirm account deletion");

        verify(userRepository, never()).findById(userId);
    }

    private static User passwordUser() {
        return new User(
            UUID.randomUUID(),
            "member@example.com",
            null,
            "old-hash",
            "Member",
            Instant.now()
        );
    }
}
