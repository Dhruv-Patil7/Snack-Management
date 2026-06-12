package com.snackmgmt.repository;

import com.snackmgmt.entity.Redemption;
import com.snackmgmt.enums.SnackSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RedemptionRepository extends JpaRepository<Redemption, Long> {

    // Check for duplicate: same employee, same session, same day
    @Query("SELECT r FROM Redemption r WHERE r.employee.id = :employeeId " +
           "AND r.session = :session " +
           "AND CAST(r.redeemedAt AS LocalDate) = :date")
    Optional<Redemption> findByEmployeeAndSessionAndDate(
            @Param("employeeId") Long employeeId,
            @Param("session") SnackSession session,
            @Param("date") LocalDate date);

    // Today's count by session
    @Query("SELECT COUNT(r) FROM Redemption r WHERE r.session = :session " +
           "AND CAST(r.redeemedAt AS LocalDate) = :date")
    long countBySessionAndDate(
            @Param("session") SnackSession session,
            @Param("date") LocalDate date);

    // Monthly count
    @Query("SELECT COUNT(r) FROM Redemption r WHERE " +
           "r.redeemedAt >= :startDate AND r.redeemedAt < :endDate")
    long countByDateRange(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    // Employee history
    List<Redemption> findByEmployeeIdOrderByRedeemedAtDesc(Long employeeId);

    Page<Redemption> findByEmployeeIdOrderByRedeemedAtDesc(Long employeeId, Pageable pageable);

    // Employee monthly count
    @Query("SELECT COUNT(r) FROM Redemption r WHERE r.employee.id = :employeeId " +
           "AND r.redeemedAt >= :startDate AND r.redeemedAt < :endDate")
    long countByEmployeeAndDateRange(
            @Param("employeeId") Long employeeId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    // All redemptions with filters (for admin history view)
    @Query("SELECT r FROM Redemption r WHERE " +
           "(:startDate IS NULL OR r.redeemedAt >= :startDate) AND " +
           "(:endDate IS NULL OR r.redeemedAt < :endDate) AND " +
           "(:session IS NULL OR r.session = :session) AND " +
           "(:employeeId IS NULL OR r.employee.id = :employeeId) " +
           "ORDER BY r.redeemedAt DESC")
    Page<Redemption> findWithFilters(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            @Param("session") SnackSession session,
            @Param("employeeId") Long employeeId,
            Pageable pageable);

    // Today's redemptions for dashboard
    @Query("SELECT r FROM Redemption r WHERE CAST(r.redeemedAt AS LocalDate) = :date " +
           "ORDER BY r.redeemedAt DESC")
    List<Redemption> findByDate(@Param("date") LocalDate date);

    // Weekly stats: group by date and session for last 7 days
    @Query("SELECT CAST(r.redeemedAt AS LocalDate) AS day, r.session, COUNT(r) " +
           "FROM Redemption r " +
           "WHERE r.redeemedAt >= :startDate AND r.redeemedAt < :endDate " +
           "GROUP BY CAST(r.redeemedAt AS LocalDate), r.session " +
           "ORDER BY day")
    List<Object[]> findWeeklyStatsRaw(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    // Distributor stats: group by distributor for current month
    @Query("SELECT r.distributor.username, COUNT(r) " +
           "FROM Redemption r " +
           "WHERE r.redeemedAt >= :startDate AND r.redeemedAt < :endDate " +
           "GROUP BY r.distributor.username " +
           "ORDER BY COUNT(r) DESC")
    List<Object[]> findDistributorStatsRaw(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByEmployeeId(Long employeeId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByDistributorId(Long distributorId);
}
