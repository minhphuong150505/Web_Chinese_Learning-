package com.chineseapp.dto.auth;

public record AuthResponse(String token, UserDto user) {
}
