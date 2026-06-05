package com.snackmgmt.service;

import com.snackmgmt.dto.response.QrTokenResponse;
import com.snackmgmt.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class QrTokenService {

    private final JwtService jwtService;

    @Value("${app.jwt.qr-expiration-ms}")
    private long qrExpirationMs;

    /**
     * Generate a short-lived QR token for the authenticated employee.
     */
    public QrTokenResponse generateQrToken(Long employeeId) {
        String token = jwtService.generateQrToken(employeeId);
        return QrTokenResponse.builder()
                .qrToken(token)
                .expiresInSeconds(qrExpirationMs / 1000)
                .build();
    }
}
