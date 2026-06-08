package com.chineseapp.controller;

import com.chineseapp.dto.pronunciation.PronunciationResponse;
import com.chineseapp.exception.ApiException;
import com.chineseapp.security.CurrentUser;
import com.chineseapp.service.PronunciationService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/pronunciation")
@Validated
public class PronunciationController {

    private final PronunciationService service;

    public PronunciationController(PronunciationService service) {
        this.service = service;
    }

    @PostMapping("/assess")
    public ResponseEntity<PronunciationResponse> assess(
        @AuthenticationPrincipal CurrentUser user,
        @RequestParam("audio") MultipartFile audio,
        @RequestParam("referenceText") @NotBlank String referenceText) {
        if (audio.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Empty audio");
        }
        return ResponseEntity.ok(service.assess(user.id(), audio, referenceText));
    }

    @GetMapping("/history")
    public ResponseEntity<List<PronunciationResponse>> history(@AuthenticationPrincipal CurrentUser user) {
        return ResponseEntity.ok(service.historyTop20(user.id()));
    }
}
