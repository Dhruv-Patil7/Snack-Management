package com.snackmgmt.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ScanQrRequest {

    @NotBlank(message = "QR token is required")
    private String qrToken;

    @NotBlank(message = "Session is required")
    private String session;  // MORNING or EVENING
}
