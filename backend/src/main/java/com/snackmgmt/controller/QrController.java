package com.snackmgmt.controller;

import com.snackmgmt.dto.response.QrTokenResponse;
import com.snackmgmt.service.QrTokenService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/qr")
@RequiredArgsConstructor
public class QrController {

    private final QrTokenService qrTokenService;

    @GetMapping("/generate")
    public ResponseEntity<QrTokenResponse> generateQrToken(Authentication authentication) {
        Claims claims = (Claims) authentication.getDetails();
        Number employeeIdNum = claims.get("employeeId", Number.class);
        Long employeeId = employeeIdNum != null ? employeeIdNum.longValue() : null;

        if (employeeId == null) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(qrTokenService.generateQrToken(employeeId));
    }
}
