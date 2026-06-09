package com.chineseapp.config;

import com.chineseapp.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtFilter) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            // Default is X-Frame-Options: DENY, which blocks even same-origin framing.
            // The HSK Materials tab renders the PDF books inside an <iframe>, so allow
            // same-origin framing (still blocks cross-site clickjacking).
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // /api/audio/** is public on purpose: it is fetched by a native <audio src>
                // tag, which cannot attach the Authorization header. Files are named with
                // unguessable UUID v4s, so this is an unguessable-link guard, not open listing.
                .requestMatchers(
                    "/api/health",
                    "/api/auth/google",
                    "/api/auth/login",
                    "/api/auth/register",
                    "/api/audio/**",
                    // HSK study materials (PDF books + listening MP3s) are loaded by
                    // native <iframe src>/<audio src> tags that cannot send the JWT
                    // header. Served read-only from a fixed directory; see HskMaterialConfig.
                    "/api/hsk/material/**"
                ).permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(e -> e.authenticationEntryPoint(
                (req, res, ex) -> res.sendError(HttpStatus.UNAUTHORIZED.value(), "Unauthorized")));
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
