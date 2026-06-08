package com.chineseapp.controller;

import com.chineseapp.dto.auth.AuthResponse;
import com.chineseapp.dto.auth.GoogleLoginRequest;
import com.chineseapp.dto.auth.MockLoginRequest;
import com.chineseapp.dto.auth.UserDto;
import com.chineseapp.security.CurrentUser;
import com.chineseapp.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@Valid @RequestBody GoogleLoginRequest req) {
        return ResponseEntity.ok(service.loginWithGoogle(req.idToken()));
    }

    @PostMapping("/mock")
    public ResponseEntity<AuthResponse> mock(@Valid @RequestBody MockLoginRequest req) {
        return ResponseEntity.ok(service.loginWithMock(req.email(), req.password()));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal CurrentUser user) {
        return ResponseEntity.ok(service.me(user.id()));
    }
}
