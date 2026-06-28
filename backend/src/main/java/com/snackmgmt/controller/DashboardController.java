package com.snackmgmt.controller;

import com.snackmgmt.dto.response.DashboardResponse;
import com.snackmgmt.dto.response.RedemptionResponse;
import com.snackmgmt.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/today")
    public ResponseEntity<DashboardResponse> getTodaySummary() {
        return ResponseEntity.ok(dashboardService.getTodaySummary());
    }

    @GetMapping("/employee/{id}")
    public ResponseEntity<Map<String, Object>> getEmployeeSummary(@PathVariable Long id) {
        List<RedemptionResponse> history = dashboardService.getEmployeeHistory(id);
        long monthlyCount = dashboardService.getEmployeeMonthlyCount(id);

        return ResponseEntity.ok(Map.of(
                "history", history,
                "monthlyCount", monthlyCount
        ));
    }

    @GetMapping("/distributor/{id}")
    public ResponseEntity<Map<String, Object>> getDistributorSummary(@PathVariable Long id) {
        List<RedemptionResponse> history = dashboardService.getDistributorHistory(id);
        long monthlyCount = dashboardService.getDistributorMonthlyCount(id);

        return ResponseEntity.ok(Map.of(
                "history", history,
                "monthlyCount", monthlyCount
        ));
    }
}
