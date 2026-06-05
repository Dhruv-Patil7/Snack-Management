package com.snackmgmt.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class EmployeeResponse {
    private Long id;
    private String employeeCode;
    private String name;
    private String department;
    private String employeeType;
    private String photoUrl;
    private Boolean active;
    private String createdAt;
}
