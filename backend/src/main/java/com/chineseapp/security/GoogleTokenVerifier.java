package com.chineseapp.security;

import com.chineseapp.config.AuthProperties;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Optional;

/**
 * Verifies a Google ID token (a JWT signed by Google). The underlying library checks
 * the signature against Google's rotating certs, expiry, issuer, and audience.
 * Returns empty on any invalid/expired token.
 */
@Component
public class GoogleTokenVerifier {

    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifier(AuthProperties properties) {
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
            .setAudience(Collections.singletonList(properties.getGoogle().getClientId()))
            .build();
    }

    public Optional<GoogleProfile> verify(String idToken) {
        try {
            GoogleIdToken token = verifier.verify(idToken);
            if (token == null) {
                return Optional.empty();
            }
            GoogleIdToken.Payload payload = token.getPayload();
            return Optional.of(new GoogleProfile(
                payload.getSubject(),
                payload.getEmail(),
                (String) payload.get("name")
            ));
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
