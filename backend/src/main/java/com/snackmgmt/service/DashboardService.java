package com.snackmgmt.service;

import com.snackmgmt.dto.response.DashboardResponse;
import com.snackmgmt.dto.response.RedemptionResponse;
import com.snackmgmt.enums.SnackSession;
import com.snackmgmt.repository.EmployeeRepository;
import com.snackmgmt.repository.RedemptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final RedemptionRepository redemptionRepository;
    private final EmployeeRepository employeeRepository;

    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd hh:mm a");

    public DashboardResponse getTodaySummary() {
        LocalDate today = LocalDate.now();
        YearMonth currentMonth = YearMonth.now();

        long morningCount = redemptionRepository.countBySessionAndDate(SnackSession.MORNING, today);
        long eveningCount = redemptionRepository.countBySessionAndDate(SnackSession.EVENING, today);

        LocalDateTime monthStart = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = currentMonth.plusMonths(1).atDay(1).atStartOfDay();
        long monthlyTotal = redemptionRepository.countByDateRange(monthStart, monthEnd);

        long totalEmployees = employeeRepository.countByActiveTrue();

        return DashboardResponse.builder()
                .morningCount(morningCount)
                .eveningCount(eveningCount)
                .monthlyTotal(monthlyTotal)
                .totalActiveEmployees(totalEmployees)
                .build();
    }

    public List<RedemptionResponse> getEmployeeHistory(Long employeeId) {
        return redemptionRepository.findByEmployeeIdOrderByRedeemedAtDesc(employeeId)
                .stream()
                .map(r -> RedemptionResponse.builder()
                        .id(r.getId())
                        .employeeId(r.getEmployee().getId())
                        .employeeCode(r.getEmployee().getEmployeeCode())
                        .employeeName(r.getEmployee().getName())
                        .department(r.getEmployee().getDepartment())
                        .session(r.getSession().name())
                        .redemptionMode(r.getRedemptionMode().name())
                        .redeemedAt(r.getRedeemedAt().format(DATETIME_FORMATTER))
                        .distributorId(r.getDistributor().getId())
                        .distributorName(r.getDistributor().getUsername())
                        .build())
                .collect(Collectors.toList());
    }

    public long getEmployeeMonthlyCount(Long employeeId) {
        YearMonth currentMonth = YearMonth.now();
        LocalDateTime monthStart = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = currentMonth.plusMonths(1).atDay(1).atStartOfDay();
        return redemptionRepository.countByEmployeeAndDateRange(employeeId, monthStart, monthEnd);
    }
}
