package com.chineseapp.controller;

import com.chineseapp.dto.translation.TranslationRequest;
import com.chineseapp.dto.translation.TranslationResponse;
import com.chineseapp.security.CurrentUser;
import com.chineseapp.service.TranslationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/translation")
@Validated
public class TranslationController {

    private final TranslationService service;

    public TranslationController(TranslationService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<TranslationResponse> translate(@AuthenticationPrincipal CurrentUser user,
                                                         @Valid @RequestBody TranslationRequest req) {
        return ResponseEntity.ok(service.translate(req));
    }
}
