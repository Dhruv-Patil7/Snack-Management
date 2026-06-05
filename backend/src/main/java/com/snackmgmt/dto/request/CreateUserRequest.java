package com.snackmgmt.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateUserRequest {

    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @Size(min = 4, max = 4, message = "PIN must be exactly 4 digits")
    private String pin;

    @NotBlank(message = "Role is required")
    private String role;  // ADMIN, DISTRIBUTOR, EMPLOYEE

    private Long employeeId;  // Required for EMPLOYEE role, null for others
}
