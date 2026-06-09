package com.chineseapp.controller;

import com.chineseapp.config.LetterProperties;
import com.chineseapp.exception.ApiException;
import com.chineseapp.security.CurrentUser;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/letter")
public class LetterController {

    private final LetterProperties properties;
    private final Resource letter = new ClassPathResource("private/ThuGuiKimHan.md");

    public LetterController(LetterProperties properties) {
        this.properties = properties;
    }

    @GetMapping(value = "/kim-han", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> kimHan(@AuthenticationPrincipal CurrentUser user) {
        if (!properties.isAllowed(user.email())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This letter is private");
        }

        try {
            return ResponseEntity.ok(letter.getContentAsString(StandardCharsets.UTF_8));
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Letter content is unavailable");
        }
    }
}
