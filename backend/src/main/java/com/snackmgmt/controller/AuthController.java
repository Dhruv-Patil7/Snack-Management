package com.snackmgmt.controller;

import com.snackmgmt.dto.request.ChangePasswordRequest;
import com.snackmgmt.dto.request.LoginRequest;
import com.snackmgmt.dto.response.LoginResponse;
import com.snackmgmt.service.AuthService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        authService.changePassword(userId, request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(Authentication authentication) {
        Claims claims = (Claims) authentication.getDetails();
        return ResponseEntity.ok(Map.of(
                "userId", authentication.getName(),
                "role", claims.get("role", String.class),
                "employeeId", claims.get("employeeId") != null ? claims.get("employeeId") : ""
        ));
    }
}
