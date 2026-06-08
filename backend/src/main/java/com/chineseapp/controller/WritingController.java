package com.chineseapp.controller;

import com.chineseapp.dto.writing.WritingFeedbackRequest;
import com.chineseapp.dto.writing.WritingFeedbackResponse;
import com.chineseapp.security.CurrentUser;
import com.chineseapp.service.WritingFeedbackService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/writing")
@Validated
public class WritingController {

    private final WritingFeedbackService service;

    public WritingController(WritingFeedbackService service) {
        this.service = service;
    }

    @PostMapping("/feedback")
    public ResponseEntity<WritingFeedbackResponse> feedback(@AuthenticationPrincipal CurrentUser user,
                                                            @Valid @RequestBody WritingFeedbackRequest req) {
        return ResponseEntity.ok(service.review(req));
    }
}
