package com.snackmgmt.service;

import com.snackmgmt.dto.request.ConfirmRedemptionRequest;
import com.snackmgmt.dto.request.ManualRedeemRequest;
import com.snackmgmt.dto.request.ScanQrRequest;
import com.snackmgmt.dto.response.RedemptionResponse;
import com.snackmgmt.dto.response.ScanResultResponse;
import com.snackmgmt.entity.Employee;
import com.snackmgmt.entity.Redemption;
import com.snackmgmt.entity.User;
import com.snackmgmt.enums.EmployeeType;
import com.snackmgmt.enums.RedemptionMode;
import com.snackmgmt.enums.Role;
import com.snackmgmt.enums.SnackSession;
import com.snackmgmt.exception.DuplicateRedemptionException;
import com.snackmgmt.exception.InvalidPinException;
import com.snackmgmt.exception.InvalidQrTokenException;
import com.snackmgmt.exception.ResourceNotFoundException;
import com.snackmgmt.repository.EmployeeRepository;
import com.snackmgmt.repository.RedemptionRepository;
import com.snackmgmt.repository.UserRepository;
import com.snackmgmt.security.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.impl.DefaultClaims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RedemptionServiceTest {

    @Mock
    private RedemptionRepository redemptionRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private RedemptionService redemptionService;

    private Employee activeEmployee;
    private Employee inactiveEmployee;
    private User distributorUser;
    private User employeeUser;
    private Claims qrClaims;

    @BeforeEach
    void setUp() {
        activeEmployee = Employee.builder()
                .id(10L)
                .employeeCode("EMP001")
                .name("John Doe")
                .department("Engineering")
                .employeeType(EmployeeType.OFFICE)
                .photoPath("john.jpg")
                .active(true)
                .build();

        inactiveEmployee = Employee.builder()
                .id(11L)
                .employeeCode("EMP002")
                .name("Jane Smith")
                .active(false)
                .build();

        distributorUser = User.builder()
                .id(2L)
                .username("dist1")
                .role(Role.DISTRIBUTOR)
                .active(true)
                .build();

        employeeUser = User.builder()
                .id(3L)
                .employee(activeEmployee)
                .username("john_doe")
                .role(Role.EMPLOYEE)
                .pinHash("$2a$10$hashedPin")
                .active(true)
                .build();

        Map<String, Object> claimsMap = new HashMap<>();
        claimsMap.put("employeeId", 10L);
        claimsMap.put("type", "QR");
        qrClaims = new DefaultClaims(claimsMap);
    }

    @Test
    void scanQr_HappyPath_Success() {
        ScanQrRequest request = new ScanQrRequest();
        request.setQrToken("validQrToken");
        request.setSession("MORNING");

        when(jwtService.validateQrToken("validQrToken")).thenReturn(qrClaims);
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(activeEmployee));
        when(redemptionRepository.findByEmployeeAndSessionAndDate(eq(10L), eq(SnackSession.MORNING), any(LocalDate.class)))
                .thenReturn(Optional.empty());

        ScanResultResponse response = redemptionService.scanQr(request, 2L);

        assertNotNull(response);
        assertEquals(10L, response.getEmployeeId());
        assertEquals("EMP001", response.getEmployeeCode());
        assertEquals("John Doe", response.getEmployeeName());
        assertFalse(response.isAlreadyRedeemed());
        assertNull(response.getAlreadyRedeemedAt());
    }

    @Test
    void scanQr_DuplicateRedemption_ReturnsAlreadyRedeemed() {
        ScanQrRequest request = new ScanQrRequest();
        request.setQrToken("validQrToken");
        request.setSession("MORNING");

        Redemption existingRedemption = Redemption.builder()
                .id(100L)
                .employee(activeEmployee)
                .distributor(distributorUser)
                .session(SnackSession.MORNING)
                .redeemedAt(LocalDateTime.now().minusHours(1))
                .build();

        when(jwtService.validateQrToken("validQrToken")).thenReturn(qrClaims);
        when(employeeRepository.findById(10L)).thenReturn(Optional.of(activeEmployee));
        when(redemptionRepository.findByEmployeeAndSessionAndDate(eq(10L), eq(SnackSession.MORNING), any(LocalDate.class)))
                .thenReturn(Optional.of(existingRedemption));

        ScanResultResponse response = redemptionService.scanQr(request, 2L);

        assertNotNull(response);
        assertTrue(response.isAlreadyRedeemed());
        assertNotNull(response.getAlreadyRedeemedAt());
    }

    @Test
    void scanQr_InvalidToken_ThrowsException() {
        ScanQrRequest request = new ScanQrRequest();
        request.setQrToken("invalidToken");
        request.setSession("MORNING");

        when(jwtService.validateQrToken("invalidToken")).thenThrow(new JwtException("Invalid signature"));

        assertThrows(InvalidQrTokenException.class, () -> redemptionService.scanQr(request, 2L));
    }

    @Test
    void scanQr_InactiveEmployee_ThrowsException() {
        ScanQrRequest request = new ScanQrRequest();
        request.setQrToken("validQrToken");
        request.setSession("MORNING");

        Map<String, Object> claimsMap = new HashMap<>();
        claimsMap.put("employeeId", 11L);
        Claims inactiveClaims = new DefaultClaims(claimsMap);

        when(jwtService.validateQrToken("validQrToken")).thenReturn(inactiveClaims);
        when(employeeRepository.findById(11L)).thenReturn(Optional.of(inactiveEmployee));

        assertThrows(InvalidQrTokenException.class, () -> redemptionService.scanQr(request, 2L));
    }

    @Test
    void confirmRedemption_HappyPath_Success() {
        ConfirmRedemptionRequest request = new ConfirmRedemptionRequest();
        request.setEmployeeId(10L);
        request.setSession("MORNING");

        when(employeeRepository.findById(10L)).thenReturn(Optional.of(activeEmployee));
        when(userRepository.findById(2L)).thenReturn(Optional.of(distributorUser));
        when(redemptionRepository.findByEmployeeAndSessionAndDate(eq(10L), eq(SnackSession.MORNING), any(LocalDate.class)))
                .thenReturn(Optional.empty());

        Redemption savedRedemption = Redemption.builder()
                .id(101L)
                .employee(activeEmployee)
                .distributor(distributorUser)
                .session(SnackSession.MORNING)
                .redemptionMode(RedemptionMode.DYNAMIC_QR)
                .redeemedAt(LocalDateTime.now())
                .build();

        when(redemptionRepository.save(any(Redemption.class))).thenReturn(savedRedemption);

        RedemptionResponse response = redemptionService.confirmRedemption(request, 2L);

        assertNotNull(response);
        assertEquals(101L, response.getId());
        assertEquals(10L, response.getEmployeeId());
        assertEquals("MORNING", response.getSession());
        assertEquals("DYNAMIC_QR", response.getRedemptionMode());
        assertEquals("dist1", response.getDistributorName());
    }

    @Test
    void confirmRedemption_Duplicate_ThrowsException() {
        ConfirmRedemptionRequest request = new ConfirmRedemptionRequest();
        request.setEmployeeId(10L);
        request.setSession("MORNING");

        Redemption existingRedemption = Redemption.builder()
                .id(100L)
                .employee(activeEmployee)
                .distributor(distributorUser)
                .session(SnackSession.MORNING)
                .redeemedAt(LocalDateTime.now().minusHours(1))
                .build();

        when(employeeRepository.findById(10L)).thenReturn(Optional.of(activeEmployee));
        when(userRepository.findById(2L)).thenReturn(Optional.of(distributorUser));
        when(redemptionRepository.findByEmployeeAndSessionAndDate(eq(10L), eq(SnackSession.MORNING), any(LocalDate.class)))
                .thenReturn(Optional.of(existingRedemption));

        assertThrows(DuplicateRedemptionException.class, () -> redemptionService.confirmRedemption(request, 2L));
    }

    @Test
    void manualRedeem_HappyPath_Success() {
        ManualRedeemRequest request = new ManualRedeemRequest();
        request.setEmployeeCode("EMP001");
        request.setPin("1234");
        request.setSession("EVENING");

        when(employeeRepository.findByEmployeeCode("EMP001")).thenReturn(Optional.of(activeEmployee));
        when(userRepository.findByEmployeeId(10L)).thenReturn(Optional.of(employeeUser));
        when(passwordEncoder.matches("1234", "$2a$10$hashedPin")).thenReturn(true);
        when(userRepository.findById(2L)).thenReturn(Optional.of(distributorUser));
        when(redemptionRepository.findByEmployeeAndSessionAndDate(eq(10L), eq(SnackSession.EVENING), any(LocalDate.class)))
                .thenReturn(Optional.empty());

        Redemption savedRedemption = Redemption.builder()
                .id(102L)
                .employee(activeEmployee)
                .distributor(distributorUser)
                .session(SnackSession.EVENING)
                .redemptionMode(RedemptionMode.MANUAL)
                .redeemedAt(LocalDateTime.now())
                .build();

        when(redemptionRepository.save(any(Redemption.class))).thenReturn(savedRedemption);

        RedemptionResponse response = redemptionService.manualRedeem(request, 2L);

        assertNotNull(response);
        assertEquals(102L, response.getId());
        assertEquals("MANUAL", response.getRedemptionMode());
        assertEquals("EVENING", response.getSession());
    }

    @Test
    void manualRedeem_InvalidPin_ThrowsException() {
        ManualRedeemRequest request = new ManualRedeemRequest();
        request.setEmployeeCode("EMP001");
        request.setPin("9999");
        request.setSession("EVENING");

        when(employeeRepository.findByEmployeeCode("EMP001")).thenReturn(Optional.of(activeEmployee));
        when(userRepository.findByEmployeeId(10L)).thenReturn(Optional.of(employeeUser));
        when(passwordEncoder.matches("9999", "$2a$10$hashedPin")).thenReturn(false);

        assertThrows(InvalidPinException.class, () -> redemptionService.manualRedeem(request, 2L));
    }

    @Test
    void manualRedeem_InactiveEmployee_ThrowsException() {
        ManualRedeemRequest request = new ManualRedeemRequest();
        request.setEmployeeCode("EMP002");
        request.setPin("1234");
        request.setSession("EVENING");

        when(employeeRepository.findByEmployeeCode("EMP002")).thenReturn(Optional.of(inactiveEmployee));

        assertThrows(IllegalArgumentException.class, () -> redemptionService.manualRedeem(request, 2L));
    }
}
