package com.chineseapp.controller;

import com.chineseapp.dto.auth.AuthResponse;
import com.chineseapp.dto.auth.ChangePasswordRequest;
import com.chineseapp.dto.auth.DeleteAccountRequest;
import com.chineseapp.dto.auth.GoogleLoginRequest;
import com.chineseapp.dto.auth.LoginRequest;
import com.chineseapp.dto.auth.RegisterRequest;
import com.chineseapp.dto.auth.UserDto;
import com.chineseapp.security.CurrentUser;
import com.chineseapp.service.AccountService;
import com.chineseapp.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService service;
    private final AccountService accountService;

    public AuthController(AuthService service, AccountService accountService) {
        this.service = service;
        this.accountService = accountService;
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@Valid @RequestBody GoogleLoginRequest req) {
        return ResponseEntity.ok(service.loginWithGoogle(req.idToken()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(service.login(req.email(), req.password()));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(service.register(req.displayName(), req.email(), req.password()));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal CurrentUser user) {
        return ResponseEntity.ok(service.me(user.id()));
    }

    @PatchMapping("/password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal CurrentUser user,
                                               @Valid @RequestBody ChangePasswordRequest req) {
        accountService.changePassword(user.id(), req.currentPassword(), req.newPassword());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/account")
    public ResponseEntity<Void> deleteAccount(@AuthenticationPrincipal CurrentUser user,
                                              @Valid @RequestBody DeleteAccountRequest req) {
        accountService.deleteAccount(user.id(), req.currentPassword(), req.confirmation());
        return ResponseEntity.noContent().build();
    }
}
