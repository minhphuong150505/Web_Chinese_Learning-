package com.chineseapp.service;

import com.chineseapp.dto.auth.AuthResponse;
import com.chineseapp.dto.auth.UserDto;

import java.util.UUID;

public interface AuthService {

    AuthResponse loginWithGoogle(String idToken);

    AuthResponse login(String email, String password);

    AuthResponse register(String displayName, String email, String password);

    UserDto me(UUID userId);
}
