package com.chineseapp.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("app.auth")
public class AuthProperties {

    @Valid
    private final Jwt jwt = new Jwt();

    @Valid
    private final Google google = new Google();

    public Jwt getJwt() {
        return jwt;
    }

    public Google getGoogle() {
        return google;
    }

    public static class Jwt {

        @NotBlank
        @Size(min = 32, message = "JWT_SECRET must be at least 32 bytes for HS256")
        private String secret;

        private int expiryDays = 7;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public int getExpiryDays() {
            return expiryDays;
        }

        public void setExpiryDays(int expiryDays) {
            this.expiryDays = expiryDays;
        }
    }

    public static class Google {

        @NotBlank
        private String clientId;

        public String getClientId() {
            return clientId;
        }

        public void setClientId(String clientId) {
            this.clientId = clientId;
        }
    }
}
