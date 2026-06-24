package com.snackmgmt.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class DashboardResponse {
    private long morningCount;
    private long eveningCount;
    private long nightCount;
    private long monthlyTotal;
    private long totalActiveEmployees;
    private List<DailyStat> weeklyStats;
    private List<DistributorStat> distributorStats;
}
