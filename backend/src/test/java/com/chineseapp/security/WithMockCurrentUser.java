package com.chineseapp.security;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithSecurityContext;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.util.List;
import java.util.UUID;

/**
 * Test annotation that injects a {@link CurrentUser} principal into the security
 * context, so {@code @AuthenticationPrincipal CurrentUser} resolves in controller
 * slice tests. {@code @WithMockUser} does not work here — it sets a String/User
 * principal that resolves to null for our typed principal.
 */
@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithMockCurrentUser.Factory.class)
public @interface WithMockCurrentUser {

    String id() default "00000000-0000-0000-0000-000000000001";

    String email() default "tester@example.com";

    String name() default "Tester";

    class Factory implements WithSecurityContextFactory<WithMockCurrentUser> {
        @Override
        public SecurityContext createSecurityContext(WithMockCurrentUser a) {
            var principal = new CurrentUser(UUID.fromString(a.id()), a.email(), a.name());
            var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
            SecurityContext ctx = SecurityContextHolder.createEmptyContext();
            ctx.setAuthentication(auth);
            return ctx;
        }
    }
}
