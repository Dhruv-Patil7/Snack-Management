package com.snackmgmt.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class RedemptionResponse {
    private Long id;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String department;
    private String session;
    private String redemptionMode;
    private String redeemedAt;
    private Long distributorId;
    private String distributorName;
    private String snackItem;
}
