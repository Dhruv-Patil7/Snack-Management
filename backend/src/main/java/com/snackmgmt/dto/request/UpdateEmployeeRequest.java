package com.snackmgmt.dto.request;

import lombok.Data;

@Data
public class UpdateEmployeeRequest {

    private String name;
    private String department;
    private String employeeType;
    private Boolean active;
}
