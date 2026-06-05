package com.snackmgmt.controller;

import com.snackmgmt.dto.request.ConfirmRedemptionRequest;
import com.snackmgmt.dto.request.ManualRedeemRequest;
import com.snackmgmt.dto.request.ScanQrRequest;
import com.snackmgmt.dto.response.RedemptionResponse;
import com.snackmgmt.dto.response.ScanResultResponse;
import com.snackmgmt.service.RedemptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import io.jsonwebtoken.Claims;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/redemptions")
@RequiredArgsConstructor
public class RedemptionController {

    private final RedemptionService redemptionService;

    /**
     * Step 1: Distributor scans QR → get employee info for visual verification.
     */
    @PostMapping("/scan")
    public ResponseEntity<ScanResultResponse> scanQr(
            @Valid @RequestBody ScanQrRequest request,
            Authentication authentication) {
        Long distributorId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(redemptionService.scanQr(request, distributorId));
    }

    /**
     * Step 2: Distributor confirms redemption after visual verification.
     */
    @PostMapping("/confirm")
    public ResponseEntity<RedemptionResponse> confirmRedemption(
            @Valid @RequestBody ConfirmRedemptionRequest request,
            Authentication authentication) {
        Long distributorId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(redemptionService.confirmRedemption(request, distributorId));
    }

    /**
     * Manual redemption (forgot-ID flow): employee code + PIN.
     */
    @PostMapping("/manual")
    public ResponseEntity<RedemptionResponse> manualRedeem(
            @Valid @RequestBody ManualRedeemRequest request,
            Authentication authentication) {
        Long distributorId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(redemptionService.manualRedeem(request, distributorId));
    }

    /**
     * Employee views their own redemption history.
     */
    @GetMapping("/my-history")
    public ResponseEntity<List<RedemptionResponse>> getMyHistory(Authentication authentication) {
        Claims claims = (Claims) authentication.getDetails();
        Number employeeIdNum = claims.get("employeeId", Number.class);
        Long employeeId = employeeIdNum != null ? employeeIdNum.longValue() : null;
        return ResponseEntity.ok(redemptionService.getMyHistory(employeeId));
    }

    /**
     * Admin views all redemption history with optional filters.
     */
    @GetMapping("/history")
    public ResponseEntity<Page<RedemptionResponse>> getHistory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String session,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        LocalDateTime start = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime end = endDate != null ? endDate.plusDays(1).atStartOfDay() : null;

        return ResponseEntity.ok(redemptionService.getHistory(
                start, end, session, employeeId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "redeemedAt"))
        ));
    }
}
