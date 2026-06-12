package com.snackmgmt.service;

import com.snackmgmt.dto.request.UpdateEmployeeRequest;
import com.snackmgmt.entity.Employee;
import com.snackmgmt.entity.User;
import com.snackmgmt.enums.EmployeeType;
import com.snackmgmt.repository.EmployeeRepository;
import com.snackmgmt.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceDeactivateTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private EmployeeService employeeService;

    @Test
    void testDeactivateEmployee() {
        // Mock security context
        SecurityContext securityContext = mock(SecurityContext.class);
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("1"); // Logged in user ID is 1 (admin)
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);

        // Employee to deactivate (id = 2)
        Employee employee = Employee.builder()
                .id(2L)
                .employeeCode("EMP002")
                .name("Aman Sheikh")
                .employeeType(EmployeeType.OFFICE)
                .active(true)
                .build();

        // Linked User account (id = 2L, username = "amanG")
        User user = User.builder()
                .id(2L)
                .employee(employee)
                .username("amanG")
                .active(true)
                .build();

        when(employeeRepository.findById(2L)).thenReturn(Optional.of(employee));
        when(userRepository.findByEmployeeId(2L)).thenReturn(Optional.of(user));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(i -> i.getArguments()[0]);
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArguments()[0]);

        UpdateEmployeeRequest request = new UpdateEmployeeRequest();
        request.setActive(false);

        employeeService.updateEmployee(2L, request);

        assertFalse(employee.getActive());
        assertFalse(user.getActive());
    }
}
