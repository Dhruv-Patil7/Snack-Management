package com.snackmgmt.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

/**
 * Returned after scanning a QR code, before the distributor confirms.
 * Contains employee details for visual verification.
 */
@Data
@Builder
@AllArgsConstructor
public class ScanResultResponse {
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String department;
    private String photoUrl;
    private String session;
    private boolean alreadyRedeemed;
    private String alreadyRedeemedAt;  // null if not redeemed; timestamp if already done
}
