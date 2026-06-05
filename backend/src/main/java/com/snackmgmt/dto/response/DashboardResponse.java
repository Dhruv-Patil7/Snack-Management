package com.snackmgmt.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class DashboardResponse {
    private long morningCount;
    private long eveningCount;
    private long monthlyTotal;
    private long totalActiveEmployees;
}
