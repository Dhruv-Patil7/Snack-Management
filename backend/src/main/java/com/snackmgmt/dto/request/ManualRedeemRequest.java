package com.snackmgmt.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ManualRedeemRequest {

    @NotBlank(message = "Employee code is required")
    private String employeeCode;

    @NotBlank(message = "PIN is required")
    @Size(min = 4, max = 4, message = "PIN must be 4 digits")
    private String pin;

    @NotBlank(message = "Session is required")
    private String session;  // MORNING or EVENING

    @NotBlank(message = "Snack item is required")
    private String snackItem;

    // Optional: plant area where snacks are being distributed (e.g. TPP, E & I, CCR)
    private String plantArea;
}
