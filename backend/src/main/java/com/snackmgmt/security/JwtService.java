package com.snackmgmt.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long loginExpirationMs;
    private final long qrExpirationMs;

    // In-memory jti cache for one-time-use QR tokens
    // Maps jti -> expiration instant
    private final ConcurrentHashMap<String, Instant> usedJtiCache = new ConcurrentHashMap<>();

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.login-expiration-ms}") long loginExpirationMs,
            @Value("${app.jwt.qr-expiration-ms}") long qrExpirationMs) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.loginExpirationMs = loginExpirationMs;
        this.qrExpirationMs = qrExpirationMs;
    }

    /**
     * Generate a login JWT for authenticated users.
     * Lifetime: 8 hours.
     */
    public String generateLoginToken(Long userId, String username, String role, Long employeeId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("type", "LOGIN");
        if (employeeId != null) {
            claims.put("employeeId", employeeId);
        }

        return Jwts.builder()
                .claims(claims)
                .subject(userId.toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + loginExpirationMs))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Generate a short-lived QR JWT for employee QR code display.
     * Lifetime: 30 seconds. Includes a unique jti for one-time-use enforcement.
     */
    public String generateQrToken(Long employeeId) {
        String jti = UUID.randomUUID().toString();

        return Jwts.builder()
                .claim("type", "QR")
                .claim("employeeId", employeeId)
                .id(jti)
                .subject(employeeId.toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + qrExpirationMs))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Validate and parse a JWT token.
     * Returns the claims if valid; throws exception if invalid/expired.
     */
    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Validate a QR token with additional one-time-use check.
     * Returns claims if valid and not previously used.
     */
    public Claims validateQrToken(String token) {
        Claims claims = validateToken(token);

        // Verify this is a QR-type token
        String type = claims.get("type", String.class);
        if (!"QR".equals(type)) {
            throw new JwtException("Token is not a QR token");
        }

        // Check jti for one-time use
        String jti = claims.getId();
        if (jti == null) {
            throw new JwtException("QR token missing jti");
        }

        // Clean expired entries from cache periodically
        cleanExpiredJti();

        // Try to mark this jti as used
        Instant previousUse = usedJtiCache.putIfAbsent(jti, claims.getExpiration().toInstant());
        if (previousUse != null) {
            throw new JwtException("QR token already used (replay detected)");
        }

        return claims;
    }

    /**
     * Extract the subject (user ID) from a token.
     */
    public String extractSubject(String token) {
        return validateToken(token).getSubject();
    }

    /**
     * Extract the role from a token.
     */
    public String extractRole(String token) {
        return validateToken(token).get("role", String.class);
    }

    /**
     * Check if a token is expired.
     */
    public boolean isTokenExpired(String token) {
        try {
            Claims claims = validateToken(token);
            return claims.getExpiration().before(new Date());
        } catch (ExpiredJwtException e) {
            return true;
        } catch (JwtException e) {
            return true;
        }
    }

    /**
     * Remove expired jti entries from the cache to prevent memory leaks.
     */
    private void cleanExpiredJti() {
        Instant now = Instant.now();
        usedJtiCache.entrySet().removeIf(entry -> entry.getValue().isBefore(now));
    }
}
