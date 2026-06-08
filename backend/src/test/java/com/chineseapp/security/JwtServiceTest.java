package com.chineseapp.security;

import com.chineseapp.config.AuthProperties;
import com.chineseapp.entity.User;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private static AuthProperties props(int expiryDays) {
        AuthProperties p = new AuthProperties();
        p.getJwt().setSecret("test-jwt-secret-at-least-32-bytes-long-000");
        p.getJwt().setExpiryDays(expiryDays);
        p.getGoogle().setClientId("test-client-id");
        return p;
    }

    private static User user(UUID id) {
        return new User(id, "tester@example.com", "google-sub-123", "Tester", Instant.now());
    }

    @Test
    void verify_givenFreshlyIssuedToken_thenReturnsUserId() {
        JwtService service = new JwtService(props(7));
        UUID id = UUID.randomUUID();

        String token = service.issue(user(id));

        assertThat(service.verify(token)).contains(id);
    }

    @Test
    void verify_givenGarbageToken_thenReturnsEmpty() {
        JwtService service = new JwtService(props(7));

        assertThat(service.verify("not-a-real-jwt")).isEmpty();
    }

    @Test
    void verify_givenExpiredToken_thenReturnsEmpty() {
        JwtService service = new JwtService(props(-1));
        String token = service.issue(user(UUID.randomUUID()));

        assertThat(service.verify(token)).isEmpty();
    }

    @Test
    void verify_givenTokenSignedWithDifferentSecret_thenReturnsEmpty() {
        AuthProperties other = props(7);
        other.getJwt().setSecret("a-completely-different-secret-key-32-bytes");
        String token = new JwtService(other).issue(user(UUID.randomUUID()));

        JwtService service = new JwtService(props(7));

        assertThat(service.verify(token)).isEmpty();
    }
}
