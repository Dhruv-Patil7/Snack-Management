package com.snackmgmt.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConfirmRedemptionRequest {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotBlank(message = "Session is required")
    private String session;  // MORNING or EVENING

    @NotBlank(message = "Snack item is required")
    private String snackItem;

    // Optional: plant area where snacks are being distributed (e.g. TPP, E & I, CCR)
    private String plantArea;
}
