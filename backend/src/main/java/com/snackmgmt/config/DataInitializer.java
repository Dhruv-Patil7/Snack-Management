package com.snackmgmt.config;

import com.snackmgmt.entity.Employee;
import com.snackmgmt.entity.User;
import com.snackmgmt.enums.EmployeeType;
import com.snackmgmt.enums.Role;
import com.snackmgmt.repository.EmployeeRepository;
import com.snackmgmt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("Running DataInitializer...");

        // 1. Seed Admin User
        if (!userRepository.existsByUsername("admin")) {
            User admin = User.builder()
                    .username("admin")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .passwordRaw("admin123")
                    .role(Role.ADMIN)
                    .active(true)
                    .build();
            userRepository.save(admin);
            log.info("Seeded default admin user (admin / admin123)");
        }

        // 2. Seed Distributor User
        if (!userRepository.existsByUsername("distributor")) {
            User distributor = User.builder()
                    .username("distributor")
                    .passwordHash(passwordEncoder.encode("distributor123"))
                    .passwordRaw("distributor123")
                    .role(Role.DISTRIBUTOR)
                    .active(true)
                    .build();
            userRepository.save(distributor);
            log.info("Seeded default distributor user (distributor / distributor123)");
        }

        // 3. Seed Employee User
        if (!userRepository.existsByUsername("employee")) {
            Employee employee = employeeRepository.findByEmployeeCode("EMP001")
                    .orElseGet(() -> {
                        Employee emp = Employee.builder()
                                .employeeCode("EMP001")
                                .name("John Doe")
                                .department("Engineering")
                                .employeeType(EmployeeType.OFFICE)
                                .active(true)
                                .build();
                        return employeeRepository.save(emp);
                    });

            User employeeUser = User.builder()
                    .employee(employee)
                    .username("employee")
                    .passwordHash(passwordEncoder.encode("employee123"))
                    .passwordRaw("employee123")
                    .pinHash(passwordEncoder.encode("1234"))
                    .pinRaw("1234")
                    .role(Role.EMPLOYEE)
                    .active(true)
                    .build();
            userRepository.save(employeeUser);
            log.info("Seeded default employee user (employee / employee123, PIN: 1234)");
        }
    }
}
