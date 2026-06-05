package com.snackmgmt.service;

import com.snackmgmt.dto.request.ChangePasswordRequest;
import com.snackmgmt.dto.request.LoginRequest;
import com.snackmgmt.dto.response.LoginResponse;
import com.snackmgmt.entity.User;
import com.snackmgmt.repository.UserRepository;
import com.snackmgmt.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!user.getActive()) {
            throw new BadCredentialsException("Account is deactivated");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }

        Long employeeId = user.getEmployee() != null ? user.getEmployee().getId() : null;
        String employeeName = user.getEmployee() != null ? user.getEmployee().getName() : null;

        String token = jwtService.generateLoginToken(
                user.getId(),
                user.getUsername(),
                user.getRole().name(),
                employeeId
        );

        return LoginResponse.builder()
                .token(token)
                .role(user.getRole().name())
                .username(user.getUsername())
                .userId(user.getId())
                .employeeId(employeeId)
                .employeeName(employeeName)
                .build();
    }

    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadCredentialsException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordRaw(request.getNewPassword());
        userRepository.save(user);
    }
}
