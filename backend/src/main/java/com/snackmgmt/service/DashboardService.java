package com.snackmgmt.service;

import com.snackmgmt.dto.response.DailyStat;
import com.snackmgmt.dto.response.DashboardResponse;
import com.snackmgmt.dto.response.DistributorStat;
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
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final RedemptionRepository redemptionRepository;
    private final EmployeeRepository employeeRepository;

    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd hh:mm a");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MM/dd");

    public DashboardResponse getTodaySummary() {
        LocalDate today = LocalDate.now();
        YearMonth currentMonth = YearMonth.now();

        long morningCount = redemptionRepository.countBySessionAndDate(SnackSession.MORNING, today);
        long eveningCount = redemptionRepository.countBySessionAndDate(SnackSession.EVENING, today);

        LocalDateTime monthStart = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = currentMonth.plusMonths(1).atDay(1).atStartOfDay();
        long monthlyTotal = redemptionRepository.countByDateRange(monthStart, monthEnd);

        long totalEmployees = employeeRepository.countByActiveTrue();

        // Weekly stats: last 7 days including today
        List<DailyStat> weeklyStats = buildWeeklyStats(today);

        // Distributor stats for the current month
        List<DistributorStat> distributorStats = buildDistributorStats(monthStart, monthEnd);

        return DashboardResponse.builder()
                .morningCount(morningCount)
                .eveningCount(eveningCount)
                .monthlyTotal(monthlyTotal)
                .totalActiveEmployees(totalEmployees)
                .weeklyStats(weeklyStats)
                .distributorStats(distributorStats)
                .build();
    }

    private List<DailyStat> buildWeeklyStats(LocalDate today) {
        LocalDate weekStart = today.minusDays(6);
        LocalDateTime startDt = weekStart.atStartOfDay();
        LocalDateTime endDt = today.plusDays(1).atStartOfDay();

        List<Object[]> rawStats = redemptionRepository.findWeeklyStatsRaw(startDt, endDt);

        // Build a map: date -> { MORNING: count, EVENING: count }
        Map<LocalDate, Map<SnackSession, Long>> statsMap = new LinkedHashMap<>();
        for (Object[] row : rawStats) {
            LocalDate date = (LocalDate) row[0];
            SnackSession session = (SnackSession) row[1];
            Long count = (Long) row[2];
            statsMap.computeIfAbsent(date, k -> new EnumMap<>(SnackSession.class))
                    .put(session, count);
        }

        // Build full 7-day list with 0 for missing days
        List<DailyStat> result = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate date = weekStart.plusDays(i);
            Map<SnackSession, Long> dayCounts = statsMap.getOrDefault(date, Collections.emptyMap());
            result.add(DailyStat.builder()
                    .date(date.format(DATE_FORMATTER))
                    .day(date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH))
                    .morning(dayCounts.getOrDefault(SnackSession.MORNING, 0L))
                    .evening(dayCounts.getOrDefault(SnackSession.EVENING, 0L))
                    .build());
        }
        return result;
    }

    private List<DistributorStat> buildDistributorStats(LocalDateTime monthStart, LocalDateTime monthEnd) {
        List<Object[]> rawStats = redemptionRepository.findDistributorStatsRaw(monthStart, monthEnd);
        return rawStats.stream()
                .map(row -> DistributorStat.builder()
                        .distributorName((String) row[0])
                        .count((Long) row[1])
                        .build())
                .collect(Collectors.toList());
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
