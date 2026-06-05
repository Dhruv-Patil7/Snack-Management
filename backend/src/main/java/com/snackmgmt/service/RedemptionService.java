package com.snackmgmt.service;

import com.snackmgmt.dto.request.ConfirmRedemptionRequest;
import com.snackmgmt.dto.request.ManualRedeemRequest;
import com.snackmgmt.dto.request.ScanQrRequest;
import com.snackmgmt.dto.response.RedemptionResponse;
import com.snackmgmt.dto.response.ScanResultResponse;
import com.snackmgmt.entity.Employee;
import com.snackmgmt.entity.Redemption;
import com.snackmgmt.entity.User;
import com.snackmgmt.enums.RedemptionMode;
import com.snackmgmt.enums.SnackSession;
import com.snackmgmt.exception.*;
import com.snackmgmt.repository.EmployeeRepository;
import com.snackmgmt.repository.RedemptionRepository;
import com.snackmgmt.repository.UserRepository;
import com.snackmgmt.security.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RedemptionService {

    private final RedemptionRepository redemptionRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("hh:mm a");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd hh:mm a");

    /**
     * Step 1 of QR redemption: Validate QR token and return employee info for verification.
     */
    public ScanResultResponse scanQr(ScanQrRequest request, Long distributorId) {
        // Validate the QR token
        Claims claims;
        try {
            claims = jwtService.validateQrToken(request.getQrToken());
        } catch (JwtException e) {
            throw new InvalidQrTokenException("QR code is invalid or expired: " + e.getMessage());
        }

        Number employeeIdNum = claims.get("employeeId", Number.class);
        Long employeeId = employeeIdNum != null ? employeeIdNum.longValue() : null;
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));

        if (!employee.getActive()) {
            throw new InvalidQrTokenException("Employee account is deactivated");
        }

        SnackSession session = SnackSession.valueOf(request.getSession().toUpperCase());

        // Check for duplicate redemption
        Optional<Redemption> existing = redemptionRepository
                .findByEmployeeAndSessionAndDate(employeeId, session, LocalDate.now());

        String photoUrl = employee.getPhotoPath() != null
                ? "/uploads/photos/" + employee.getPhotoPath()
                : null;

        return ScanResultResponse.builder()
                .employeeId(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .employeeName(employee.getName())
                .department(employee.getDepartment())
                .photoUrl(photoUrl)
                .session(session.name())
                .alreadyRedeemed(existing.isPresent())
                .alreadyRedeemedAt(existing.map(r -> r.getRedeemedAt().format(TIME_FORMATTER)).orElse(null))
                .build();
    }

    /**
     * Step 2 of QR redemption: Confirm after visual verification.
     */
    @Transactional
    public RedemptionResponse confirmRedemption(ConfirmRedemptionRequest request, Long distributorId) {
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", request.getEmployeeId()));

        User distributor = userRepository.findById(distributorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", distributorId));

        SnackSession session = SnackSession.valueOf(request.getSession().toUpperCase());

        // Check for duplicate
        Optional<Redemption> existing = redemptionRepository
                .findByEmployeeAndSessionAndDate(employee.getId(), session, LocalDate.now());

        if (existing.isPresent()) {
            throw new DuplicateRedemptionException(
                    session.name(),
                    existing.get().getRedeemedAt().format(TIME_FORMATTER)
            );
        }

        // Record the redemption
        Redemption redemption = Redemption.builder()
                .employee(employee)
                .distributor(distributor)
                .session(session)
                .redemptionMode(RedemptionMode.DYNAMIC_QR)
                .redeemedAt(LocalDateTime.now())
                .build();

        redemption = redemptionRepository.save(redemption);
        return toResponse(redemption);
    }

    /**
     * Manual redemption for forgot-ID flow.
     */
    @Transactional
    public RedemptionResponse manualRedeem(ManualRedeemRequest request, Long distributorId) {
        Employee employee = employeeRepository.findByEmployeeCode(request.getEmployeeCode())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "code", request.getEmployeeCode()));

        if (!employee.getActive()) {
            throw new IllegalArgumentException("Employee account is deactivated");
        }

        // Verify PIN
        User employeeUser = userRepository.findByEmployeeId(employee.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User account", "employeeId", employee.getId()));

        if (employeeUser.getPinHash() == null) {
            throw new InvalidPinException();
        }

        if (!passwordEncoder.matches(request.getPin(), employeeUser.getPinHash())) {
            throw new InvalidPinException();
        }

        User distributor = userRepository.findById(distributorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", distributorId));

        SnackSession session = SnackSession.valueOf(request.getSession().toUpperCase());

        // Check for duplicate
        Optional<Redemption> existing = redemptionRepository
                .findByEmployeeAndSessionAndDate(employee.getId(), session, LocalDate.now());

        if (existing.isPresent()) {
            throw new DuplicateRedemptionException(
                    session.name(),
                    existing.get().getRedeemedAt().format(TIME_FORMATTER)
            );
        }

        // Record the redemption
        Redemption redemption = Redemption.builder()
                .employee(employee)
                .distributor(distributor)
                .session(session)
                .redemptionMode(RedemptionMode.MANUAL)
                .redeemedAt(LocalDateTime.now())
                .build();

        redemption = redemptionRepository.save(redemption);
        return toResponse(redemption);
    }

    /**
     * Get redemption history for an employee (used by employee portal).
     */
    public List<RedemptionResponse> getMyHistory(Long employeeId) {
        return redemptionRepository.findByEmployeeIdOrderByRedeemedAtDesc(employeeId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all redemptions with optional filters (admin view).
     */
    public Page<RedemptionResponse> getHistory(
            LocalDateTime startDate, LocalDateTime endDate,
            String session, Long employeeId, Pageable pageable) {

        SnackSession sessionEnum = session != null ? SnackSession.valueOf(session.toUpperCase()) : null;

        return redemptionRepository.findWithFilters(startDate, endDate, sessionEnum, employeeId, pageable)
                .map(this::toResponse);
    }

    private RedemptionResponse toResponse(Redemption r) {
        return RedemptionResponse.builder()
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
                .build();
    }
}
