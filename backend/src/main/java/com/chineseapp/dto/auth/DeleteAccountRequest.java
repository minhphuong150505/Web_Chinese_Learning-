package com.chineseapp.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeleteAccountRequest(
    @Size(max = 72) String currentPassword,
    @NotBlank @Size(max = 16) String confirmation
) {
}
