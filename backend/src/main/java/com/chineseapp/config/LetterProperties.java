package com.chineseapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@ConfigurationProperties("app.letter")
public class LetterProperties {

    private List<String> allowedEmails = new ArrayList<>(List.of("nguoiyeukimhan"));

    public List<String> getAllowedEmails() {
        return allowedEmails;
    }

    public void setAllowedEmails(List<String> allowedEmails) {
        this.allowedEmails = allowedEmails;
    }

    public boolean isAllowed(String email) {
        String normalized = normalize(email);
        return allowedEmails.stream()
            .map(this::normalize)
            .anyMatch(normalized::equals);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
