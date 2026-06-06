package com.snackmgmt.service;

import com.snackmgmt.dto.request.CreateUserRequest;
import com.snackmgmt.dto.response.UserResponse;
import com.snackmgmt.entity.Employee;
import com.snackmgmt.entity.User;
import com.snackmgmt.enums.Role;
import com.snackmgmt.exception.ResourceNotFoundException;
import com.snackmgmt.repository.EmployeeRepository;
import com.snackmgmt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists: " + request.getUsername());
        }

        Role role = Role.valueOf(request.getRole().toUpperCase());

        Employee employee = null;
        if (role == Role.EMPLOYEE) {
            if (request.getEmployeeId() == null) {
                throw new IllegalArgumentException("Employee ID is required for EMPLOYEE role");
            }
            employee = employeeRepository.findById(request.getEmployeeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", request.getEmployeeId()));

            // Check if employee already has a user account
            if (userRepository.findByEmployeeId(request.getEmployeeId()).isPresent()) {
                throw new IllegalArgumentException("Employee already has a user account");
            }
        }

        User user = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .passwordRaw(request.getPassword())
                .role(role)
                .employee(employee)
                .build();

        if (request.getPin() != null && !request.getPin().isBlank()) {
            user.setPinHash(passwordEncoder.encode(request.getPin()));
            user.setPinRaw(request.getPin());
        }

        user = userRepository.save(user);
        return toResponse(user);
    }

    public List<UserResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public UserResponse getUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return toResponse(user);
    }

    public void resetPassword(Long id, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setPasswordRaw(newPassword);
        userRepository.save(user);
    }

    public void resetPin(Long id, String newPin) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        user.setPinHash(passwordEncoder.encode(newPin));
        user.setPinRaw(newPin);
        userRepository.save(user);
    }

    public void toggleActive(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        user.setActive(!user.getActive());
        userRepository.save(user);
    }

    private UserResponse toResponse(User u) {
        return UserResponse.builder()
                .id(u.getId())
                .username(u.getUsername())
                .role(u.getRole().name())
                .employeeId(u.getEmployee() != null ? u.getEmployee().getId() : null)
                .employeeName(u.getEmployee() != null ? u.getEmployee().getName() : null)
                .active(u.getActive())
                .createdAt(u.getCreatedAt().format(FORMATTER))
                .passwordRaw(u.getPasswordRaw() != null && !u.getPasswordRaw().isEmpty() ? u.getPasswordRaw() : u.getPasswordHash())
                .pinRaw(u.getPinRaw() != null && !u.getPinRaw().isEmpty() ? u.getPinRaw() : u.getPinHash())
                .build();
    }
}
