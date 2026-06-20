package com.snackmgmt.config;

import com.snackmgmt.entity.Employee;
import com.snackmgmt.entity.Redemption;
import com.snackmgmt.entity.User;
import com.snackmgmt.enums.EmployeeType;
import com.snackmgmt.enums.RedemptionMode;
import com.snackmgmt.enums.Role;
import com.snackmgmt.enums.SnackSession;
import com.snackmgmt.repository.EmployeeRepository;
import com.snackmgmt.repository.UserRepository;
import com.snackmgmt.repository.RedemptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final RedemptionRepository redemptionRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("Running DataInitializer...");

        // Clean up duplicate user accounts pointing to the same employee
        cleanDuplicateUserAccounts();

        // Clean up default/unnecessary distributor accounts that might be leftover in the database
        cleanDefaultDistributors();

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

        // 2. Seed Employee Users
        createEmployeeIfNotExist("EMP001", "John Doe", "Engineering", EmployeeType.OFFICE, "employee", "employee123", "1234");
        createEmployeeIfNotExist("EMP007", "Sarah Connor", "Logistics", EmployeeType.PLANT, "sarahc", "employee123", "2222");
        createEmployeeIfNotExist("EMP003", "Mike Ross", "Legal", EmployeeType.OFFICE, "miker", "employee123", "3333");
        createEmployeeIfNotExist("EMP004", "David Miller", "Production", EmployeeType.PLANT, "davidm", "employee123", "4444");
        createEmployeeIfNotExist("EMP005", "Elena Rostova", "Quality Assurance", EmployeeType.CONTRACTOR, "elenar", "employee123", "5555");
        createEmployeeIfNotExist("EMP006", "Marcus Aurelius", "Security", EmployeeType.PLANT, "marcus", "employee123", "6666");

        // 4. Seed mock redemption data for dashboard charts
        seedMockRedemptions();
    }

    private void createDistributorIfNotExist(String username, String password) {
        if (!userRepository.existsByUsername(username)) {
            User distributor = User.builder()
                    .username(username)
                    .passwordHash(passwordEncoder.encode(password))
                    .passwordRaw(password)
                    .role(Role.DISTRIBUTOR)
                    .active(true)
                    .build();
            userRepository.save(distributor);
            log.info("Seeded distributor user ({} / {})", username, password);
        }
    }

    private void createEmployeeIfNotExist(String employeeCode, String name, String department, EmployeeType employeeType, String username, String password, String pin) {
        if (!userRepository.existsByUsername(username)) {
            Employee employee = employeeRepository.findByEmployeeCode(employeeCode)
                    .orElseGet(() -> {
                        Employee emp = Employee.builder()
                                .employeeCode(employeeCode)
                                .name(name)
                                .department(department)
                                .employeeType(employeeType)
                                .active(true)
                                .build();
                        return employeeRepository.save(emp);
                    });

            // Skip user account creation if employee already has one
            if (userRepository.findByEmployeeId(employee.getId()).isPresent()) {
                log.warn("Employee with code {} already has a user account. Skipping user account seeding for {}.", employeeCode, username);
                return;
            }

            User employeeUser = User.builder()
                    .employee(employee)
                    .username(username)
                    .passwordHash(passwordEncoder.encode(password))
                    .passwordRaw(password)
                    .pinHash(passwordEncoder.encode(pin))
                    .pinRaw(pin)
                    .role(Role.EMPLOYEE)
                    .active(true)
                    .build();
            userRepository.save(employeeUser);
            log.info("Seeded employee user ({} / {}, PIN: {})", username, password, pin);
        }
    }

    private void seedMockRedemptions() {
        // Only seed if we have very few redemptions (avoid duplicating on restart)
        long existingCount = redemptionRepository.count();
        if (existingCount > 10) {
            log.info("Skipping mock redemption seeding — already have {} records.", existingCount);
            return;
        }

        log.info("Seeding mock redemption data for dashboard charts...");

        List<Employee> employees = employeeRepository.findAll().stream()
                .filter(Employee::getActive)
                .collect(Collectors.toList());
        List<User> distributors = userRepository.findByRole(Role.DISTRIBUTOR);

        if (employees.isEmpty() || distributors.isEmpty()) {
            log.warn("No employees or distributors found — skipping mock redemptions.");
            return;
        }

        Random rng = new Random(42); // Deterministic for consistency
        LocalDate today = LocalDate.now();
        RedemptionMode[] modes = { RedemptionMode.DYNAMIC_QR, RedemptionMode.MANUAL, RedemptionMode.STATIC_QR };

        // Generate redemptions for the past 7 days
        for (int daysAgo = 6; daysAgo >= 0; daysAgo--) {
            LocalDate date = today.minusDays(daysAgo);

            // Vary participation: weekdays are busier, weekends quieter
            int dayOfWeek = date.getDayOfWeek().getValue(); // 1=Mon, 7=Sun
            boolean isWeekend = dayOfWeek >= 6;
            int morningParticipants = isWeekend ? 1 + rng.nextInt(2) : 3 + rng.nextInt(Math.min(employees.size() - 2, 4));
            int eveningParticipants = isWeekend ? 0 + rng.nextInt(2) : 2 + rng.nextInt(Math.min(employees.size() - 1, 3));

            // Morning redemptions
            for (int j = 0; j < Math.min(morningParticipants, employees.size()); j++) {
                Employee emp = employees.get(j % employees.size());
                User dist = distributors.get(rng.nextInt(distributors.size()));
                int hour = 9 + rng.nextInt(2);  // 9-10 AM
                int minute = rng.nextInt(55);

                Redemption r = Redemption.builder()
                        .employee(emp)
                        .distributor(dist)
                        .session(SnackSession.MORNING)
                        .redemptionMode(modes[rng.nextInt(modes.length)])
                        .redeemedAt(LocalDateTime.of(date.getYear(), date.getMonthValue(), date.getDayOfMonth(), hour, minute))
                        .build();
                redemptionRepository.save(r);
            }

            // Evening redemptions
            for (int j = 0; j < Math.min(eveningParticipants, employees.size()); j++) {
                Employee emp = employees.get((j + 1) % employees.size());
                User dist = distributors.get(rng.nextInt(distributors.size()));
                int hour = 16 + rng.nextInt(2); // 4-5 PM
                int minute = rng.nextInt(55);

                Redemption r = Redemption.builder()
                        .employee(emp)
                        .distributor(dist)
                        .session(SnackSession.EVENING)
                        .redemptionMode(modes[rng.nextInt(modes.length)])
                        .redeemedAt(LocalDateTime.of(date.getYear(), date.getMonthValue(), date.getDayOfMonth(), hour, minute))
                        .build();
                redemptionRepository.save(r);
            }
        }

        long totalSeeded = redemptionRepository.count() - existingCount;
        log.info("Seeded {} mock redemption records across 7 days.", totalSeeded);
    }

    private void cleanDuplicateUserAccounts() {
        log.info("Checking for duplicate user accounts per employee...");
        java.util.List<Employee> employees = employeeRepository.findAll();
        for (Employee emp : employees) {
            java.util.List<User> users = userRepository.findAll().stream()
                    .filter(u -> u.getEmployee() != null && u.getEmployee().getId().equals(emp.getId()))
                    .sorted(java.util.Comparator.comparing(User::getId))
                    .collect(Collectors.toList());

            if (users.size() > 1) {
                log.warn("Found {} user accounts for employee: {}. Cleaning up duplicates...", users.size(), emp.getName());
                // Keep the first user (users.get(0)), delete the rest
                for (int i = 1; i < users.size(); i++) {
                    User userToDelete = users.get(i);
                    log.info("Deleting duplicate user: {} (ID: {})", userToDelete.getUsername(), userToDelete.getId());
                    // Delete any associated redemptions for this distributor user first to avoid constraint violation
                    redemptionRepository.deleteByDistributorId(userToDelete.getId());
                    userRepository.delete(userToDelete);
                }
            }
        }
    }

    private void cleanDefaultDistributors() {
        log.info("Checking for default/unnecessary distributor accounts to remove...");
        String[] defaultUsernames = {"distributor", "distributor_morning", "distributor_evening", "canteen_staff_1", "canteen_staff_2"};
        for (String username : defaultUsernames) {
            userRepository.findByUsername(username).ifPresent(user -> {
                log.info("Deleting default distributor account: {}", username);
                redemptionRepository.deleteByDistributorId(user.getId());
                userRepository.delete(user);
            });
        }
    }
}

