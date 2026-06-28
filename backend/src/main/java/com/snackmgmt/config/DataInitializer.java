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
    private final jakarta.persistence.EntityManager entityManager;

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void run(String... args) {
        log.info("Running DataInitializer...");

        // Alter session columns to standard VARCHAR(20) to remove any H2 enum constraints
        try {
            String dbType = null;
            try {
                org.hibernate.Session session = entityManager.unwrap(org.hibernate.Session.class);
                dbType = session.doReturningWork(conn -> conn.getMetaData().getDatabaseProductName());
            } catch (Exception ex) {
                log.warn("Failed to detect database product name: {}", ex.getMessage());
            }

            if ("H2".equalsIgnoreCase(dbType)) {
                entityManager.createNativeQuery("ALTER TABLE redemptions ALTER COLUMN session VARCHAR(20)").executeUpdate();
                entityManager.createNativeQuery("ALTER TABLE daily_menu ALTER COLUMN session VARCHAR(20)").executeUpdate();
                log.info("Successfully altered H2 database session columns to VARCHAR(20).");
            } else if ("PostgreSQL".equalsIgnoreCase(dbType)) {
                entityManager.createNativeQuery("ALTER TABLE redemptions ALTER COLUMN session TYPE VARCHAR(20)").executeUpdate();
                entityManager.createNativeQuery("ALTER TABLE daily_menu ALTER COLUMN session TYPE VARCHAR(20)").executeUpdate();
                log.info("Successfully altered PostgreSQL database session columns to VARCHAR(20).");
            } else {
                log.info("Unknown database type {}, skipping session column alter.", dbType);
            }
        } catch (Exception e) {
            log.info("Session columns alter query skipped or already VARCHAR: {}", e.getMessage());
        }

        // Clean up duplicate user accounts pointing to the same employee
        cleanDuplicateUserAccounts();

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

        // Also seed multiple distributor users for different plant areas
        createDistributorIfNotExist("distributor", "distributor123");
        createDistributorIfNotExist("dist_tpp", "distributor123");
        createDistributorIfNotExist("dist_ei", "distributor123");
        createDistributorIfNotExist("dist_ccr", "distributor123");

        // 2. Seed Employee Users
        log.info("Seeding/updating celebrity profiles...");
        createEmployeeIfNotExist("EMP001", "Taylor Swift", "Music", EmployeeType.OFFICE, "taylors", "employee123", "1234", "taylor.jpg");
        createEmployeeIfNotExist("EMP002", "Nathu Godse", "Shooter", EmployeeType.OFFICE, "nathu", "employee123", "2222", "EMP002_898c7aab.jpg");
        createEmployeeIfNotExist("EMP003", "Cristiano Ronaldo", "Sports", EmployeeType.PLANT, "ronaldo", "employee123", "3333", "ronaldo.jpg");
        createEmployeeIfNotExist("EMP004", "Lionel Messi", "Sports", EmployeeType.PLANT, "messi", "employee123", "4444", "messi.jpg");
        createEmployeeIfNotExist("EMP005", "Selena Gomez", "Acting & Music", EmployeeType.CONTRACTOR, "selena", "employee123", "5555", "selena.jpg");
        createEmployeeIfNotExist("EMP006", "Justin Bieber", "Music", EmployeeType.OFFICE, "bieber", "employee123", "6666", "bieber.jpg");

        // 4. Seed mock redemption data for dashboard charts
        log.info("Re-generating redemptions...");
        redemptionRepository.deleteAll();
        redemptionRepository.flush();
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

    private void createEmployeeIfNotExist(String employeeCode, String name, String department, EmployeeType employeeType, String username, String password, String pin, String photoPath) {
        Employee employee = employeeRepository.findByEmployeeCode(employeeCode)
                .map(emp -> {
                    emp.setName(name);
                    emp.setDepartment(department);
                    emp.setEmployeeType(employeeType);
                    emp.setPhotoPath(photoPath);
                    emp.setActive(true);
                    return employeeRepository.save(emp);
                })
                .orElseGet(() -> {
                    Employee emp = Employee.builder()
                            .employeeCode(employeeCode)
                            .name(name)
                            .department(department)
                            .employeeType(employeeType)
                            .photoPath(photoPath)
                            .active(true)
                            .build();
                    return employeeRepository.save(emp);
                });

        if (!userRepository.existsByUsername(username)) {
            userRepository.findByEmployeeId(employee.getId()).ifPresent(u -> {
                userRepository.delete(u);
                userRepository.flush();
            });

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
        // Only seed if we have no redemptions (avoid duplicating on restart)
        long existingCount = redemptionRepository.count();
        if (existingCount > 0) {
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
        String[] morningSnacks = { "Samosa", "Kachori", "Tea", "Coffee", "Samosa", "Tea" };
        String[] eveningSnacks = { "Vada Pav", "Tea", "Coffee", "Vada Pav", "Tea" };
        String[] nightSnacks = { "Upma", "Aloo Bonda", "Tea", "Coffee" };
        String[] plantAreas = { "TPP", "E & I", "CCR", "DCS", "Maintenance", "Admin Block", "Utilities" };

        // Generate redemptions for the past 7 days
        for (int daysAgo = 6; daysAgo >= 0; daysAgo--) {
            LocalDate date = today.minusDays(daysAgo);

            // Vary participation: weekdays are busier, Sunday quieter
            int dayOfWeek = date.getDayOfWeek().getValue(); // 1=Mon, 7=Sun
            boolean isWeekend = dayOfWeek == 7;
            int morningParticipants = isWeekend ? 1 + rng.nextInt(2) : 3 + (employees.size() > 2 ? rng.nextInt(Math.min(employees.size() - 2, 4)) : 0);
            int eveningParticipants = isWeekend ? 0 + rng.nextInt(2) : 2 + (employees.size() > 1 ? rng.nextInt(Math.min(employees.size() - 1, 3)) : 0);
            int nightParticipants = isWeekend ? 0 + rng.nextInt(2) : 1 + (employees.size() > 2 ? rng.nextInt(Math.min(employees.size() - 2, 3)) : 0);

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
                        .snackItem(morningSnacks[rng.nextInt(morningSnacks.length)])
                        .plantArea(plantAreas[rng.nextInt(plantAreas.length)])
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
                        .snackItem(eveningSnacks[rng.nextInt(eveningSnacks.length)])
                        .plantArea(plantAreas[rng.nextInt(plantAreas.length)])
                        .redeemedAt(LocalDateTime.of(date.getYear(), date.getMonthValue(), date.getDayOfMonth(), hour, minute))
                        .build();
                redemptionRepository.save(r);
            }

            // Night redemptions
            for (int j = 0; j < Math.min(nightParticipants, employees.size()); j++) {
                Employee emp = employees.get((j + 2) % employees.size());
                User dist = distributors.get(rng.nextInt(distributors.size()));
                int hour = 21 + rng.nextInt(2); // 9-10 PM
                int minute = rng.nextInt(55);

                Redemption r = Redemption.builder()
                        .employee(emp)
                        .distributor(dist)
                        .session(SnackSession.NIGHT)
                        .redemptionMode(modes[rng.nextInt(modes.length)])
                        .snackItem(nightSnacks[rng.nextInt(nightSnacks.length)])
                        .plantArea(plantAreas[rng.nextInt(plantAreas.length)])
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


}

