package com.chineseapp.security;

import com.chineseapp.config.AuthProperties;
import com.chineseapp.entity.User;
import com.chineseapp.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Reads a {@code Bearer} token, verifies it, loads the user, and sets a
 * {@link CurrentUser} principal in the security context. On any failure the
 * context is left empty and the request continues unauthenticated — the
 * security entry point returns 401 downstream for protected routes.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final AuthProperties authProperties;

    public JwtAuthFilter(JwtService jwtService, UserRepository userRepository, AuthProperties authProperties) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.authProperties = authProperties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            Optional<UUID> userId = jwtService.verify(token);
            if (userId.isPresent()) {
                userRepository.findById(userId.get()).ifPresent(this::authenticate);
            }
        }
        chain.doFilter(request, response);
    }

    private void authenticate(User user) {
        if (authProperties.getSingleUser().isEnabled() && !isAllowedSingleUser(user)) {
            return;
        }
        CurrentUser principal = new CurrentUser(user.getId(), user.getEmail(), user.getDisplayName());
        var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private boolean isAllowedSingleUser(User user) {
        String expected = authProperties.getSingleUser().getUsername().trim().toLowerCase(Locale.ROOT);
        return !expected.isBlank() && user.getEmail().trim().toLowerCase(Locale.ROOT).equals(expected);
    }
}
