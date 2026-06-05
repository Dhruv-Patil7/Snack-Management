package com.snackmgmt.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String username;
    private String role;
    private Long employeeId;
    private String employeeName;
    private Boolean active;
    private String createdAt;
    private String passwordRaw;
    private String pinRaw;
}
