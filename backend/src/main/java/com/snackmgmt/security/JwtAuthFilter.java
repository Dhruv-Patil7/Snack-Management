package com.snackmgmt.security;

import com.snackmgmt.entity.User;
import com.snackmgmt.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7);

        try {
            Claims claims = jwtService.validateToken(token);

            // Only process LOGIN tokens for API authentication
            String type = claims.get("type", String.class);
            if (!"LOGIN".equals(type)) {
                filterChain.doFilter(request, response);
                return;
            }

            String userId = claims.getSubject();
            String role = claims.get("role", String.class);

            if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                log.info("JwtAuthFilter checking active status for user ID: {}", userId);
                // Verify user is active in the database
                Optional<User> userOpt = userRepository.findById(Long.parseLong(userId));
                if (userOpt.isEmpty()) {
                    log.warn("JwtAuthFilter: User ID {} not found in database.", userId);
                    filterChain.doFilter(request, response);
                    return;
                }

                User user = userOpt.get();
                if (!user.getActive()) {
                    log.warn("JwtAuthFilter: User account @{} is suspended/deactivated.", user.getUsername());
                    filterChain.doFilter(request, response);
                    return;
                }

                // If this is an employee user account, verify that their employee profile is active
                if (user.getEmployee() != null && !user.getEmployee().getActive()) {
                    log.warn("JwtAuthFilter: User @{}'s linked employee profile is inactive.", user.getUsername());
                    filterChain.doFilter(request, response);
                    return;
                }

                log.info("JwtAuthFilter: User @{} is active. Authenticating request to {}", user.getUsername(), request.getRequestURI());

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userId,
                                null,
                                Collections.singletonList(
                                        new SimpleGrantedAuthority("ROLE_" + role)
                                )
                        );

                // Store full claims in details for downstream access
                authToken.setDetails(claims);

                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        } catch (JwtException | NumberFormatException e) {
            log.warn("JwtAuthFilter failed to validate token: {}", e.getMessage());
            // Invalid token — proceed without authentication
            // SecurityContext remains empty, so protected endpoints will return 401
        }

        filterChain.doFilter(request, response);
    }
}
