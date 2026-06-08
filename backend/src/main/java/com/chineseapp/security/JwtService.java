package com.chineseapp.security;

import com.chineseapp.config.AuthProperties;
import com.chineseapp.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

/**
 * Issues and verifies the application's own JWTs (HS256). The token subject is the
 * user id; {@code email} and {@code name} are carried as claims. Verification never
 * throws to the caller — any failure (bad signature, expiry, garbage) yields empty.
 */
@Component
public class JwtService {

    private final SecretKey key;
    private final Duration expiry;

    public JwtService(AuthProperties properties) {
        this.key = Keys.hmacShaKeyFor(properties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8));
        this.expiry = Duration.ofDays(properties.getJwt().getExpiryDays());
    }

    public String issue(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(user.getId().toString())
            .claim("email", user.getEmail())
            .claim("name", user.getDisplayName())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(expiry)))
            .signWith(key)
            .compact();
    }

    public Optional<UUID> verify(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
            return Optional.of(UUID.fromString(claims.getSubject()));
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
