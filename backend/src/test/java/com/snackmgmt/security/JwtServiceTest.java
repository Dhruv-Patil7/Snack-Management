package com.snackmgmt.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private final String secret = "default-dev-secret-key-change-in-production-must-be-at-least-256-bits-long";
    private final long loginExpirationMs = 3600000; // 1 hour
    private final long qrExpirationMs = 30000; // 30 seconds

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(secret, loginExpirationMs, qrExpirationMs);
    }

    @Test
    void generateLoginToken_Success() {
        String token = jwtService.generateLoginToken(1L, "john_doe", "EMPLOYEE", 10L);
        assertNotNull(token);

        Claims claims = jwtService.validateToken(token);
        assertEquals("1", claims.getSubject());
        assertEquals("EMPLOYEE", claims.get("role"));
        assertEquals("LOGIN", claims.get("type"));
        assertEquals(10L, claims.get("employeeId", Long.class));
    }

    @Test
    void generateLoginToken_WithoutEmployeeId_Success() {
        String token = jwtService.generateLoginToken(1L, "admin", "ADMIN", null);
        assertNotNull(token);

        Claims claims = jwtService.validateToken(token);
        assertEquals("1", claims.getSubject());
        assertEquals("ADMIN", claims.get("role"));
        assertEquals("LOGIN", claims.get("type"));
        assertNull(claims.get("employeeId"));
    }

    @Test
    void generateQrToken_Success() {
        String token = jwtService.generateQrToken(10L);
        assertNotNull(token);

        Claims claims = jwtService.validateQrToken(token);
        assertEquals("10", claims.getSubject());
        assertEquals("QR", claims.get("type"));
        assertEquals(10L, claims.get("employeeId", Long.class));
        assertNotNull(claims.getId()); // jti should exist
    }

    @Test
    void validateQrToken_ReplayAttack_ThrowsException() {
        String token = jwtService.generateQrToken(10L);
        assertNotNull(token);

        // First validation should succeed
        Claims claims = jwtService.validateQrToken(token);
        assertNotNull(claims);

        // Second validation with the same token should fail due to jti cache check
        assertThrows(JwtException.class, () -> jwtService.validateQrToken(token));
    }

    @Test
    void validateQrToken_NonQrType_ThrowsException() {
        // Generate a login token instead of a QR token
        String token = jwtService.generateLoginToken(1L, "john_doe", "EMPLOYEE", 10L);
        
        // QR validation should fail because it expects "QR" type
        assertThrows(JwtException.class, () -> jwtService.validateQrToken(token));
    }

    @Test
    void extractSubject_Success() {
        String token = jwtService.generateLoginToken(1L, "john_doe", "EMPLOYEE", 10L);
        assertEquals("1", jwtService.extractSubject(token));
    }

    @Test
    void extractRole_Success() {
        String token = jwtService.generateLoginToken(1L, "john_doe", "EMPLOYEE", 10L);
        assertEquals("EMPLOYEE", jwtService.extractRole(token));
    }

    @Test
    void isTokenExpired_NotExpired_ReturnsFalse() {
        String token = jwtService.generateLoginToken(1L, "john_doe", "EMPLOYEE", 10L);
        assertFalse(jwtService.isTokenExpired(token));
    }
}
