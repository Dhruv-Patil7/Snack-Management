package com.snackmgmt.service;

import com.snackmgmt.dto.request.CreateEmployeeRequest;
import com.snackmgmt.dto.request.UpdateEmployeeRequest;
import com.snackmgmt.dto.response.EmployeeResponse;
import com.snackmgmt.entity.Employee;
import com.snackmgmt.enums.EmployeeType;
import com.snackmgmt.exception.ResourceNotFoundException;
import com.snackmgmt.entity.User;
import com.snackmgmt.repository.EmployeeRepository;
import com.snackmgmt.repository.UserRepository;
import com.snackmgmt.repository.RedemptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final RedemptionRepository redemptionRepository;

    @Value("${app.upload.photo-dir}")
    private String photoDir;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public EmployeeResponse createEmployee(CreateEmployeeRequest request) {
        if (employeeRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw new IllegalArgumentException("Employee code already exists: " + request.getEmployeeCode());
        }

        EmployeeType type = EmployeeType.OFFICE;
        if (request.getEmployeeType() != null) {
            type = EmployeeType.valueOf(request.getEmployeeType().toUpperCase());
        }

        Employee employee = Employee.builder()
                .employeeCode(request.getEmployeeCode())
                .name(request.getName())
                .department(request.getDepartment())
                .employeeType(type)
                .build();

        employee = employeeRepository.save(employee);
        return toResponse(employee);
    }

    public EmployeeResponse updateEmployee(Long id, UpdateEmployeeRequest request) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));

        if (request.getName() != null) employee.setName(request.getName());
        if (request.getDepartment() != null) employee.setDepartment(request.getDepartment());
        if (request.getActive() != null) {
            if (request.getActive() == false) {
                // Check if admin is trying to deactivate their own linked employee profile
                String currentUserId = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
                userRepository.findByEmployeeId(id).ifPresent(user -> {
                    if (user.getId().toString().equals(currentUserId)) {
                        throw new IllegalArgumentException("You cannot deactivate the employee profile linked to your own logged-in account");
                    }
                });
            }
            employee.setActive(request.getActive());
            // Sync with associated user login account
            userRepository.findByEmployeeId(id).ifPresent(user -> {
                user.setActive(request.getActive());
                userRepository.save(user);
            });
        }
        if (request.getEmployeeType() != null) {
            employee.setEmployeeType(EmployeeType.valueOf(request.getEmployeeType().toUpperCase()));
        }

        employee = employeeRepository.save(employee);
        return toResponse(employee);
    }

    public EmployeeResponse getEmployee(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));
        return toResponse(employee);
    }

    public Page<EmployeeResponse> listEmployees(String search, Pageable pageable) {
        Page<Employee> page;
        if (search != null && !search.isBlank()) {
            page = employeeRepository.searchEmployees(search.trim(), pageable);
        } else {
            page = employeeRepository.findAll(pageable);
        }
        return page.map(this::toResponse);
    }

    public List<EmployeeResponse> searchEmployees(String query) {
        return employeeRepository.searchByNameOrCode(query.trim())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteEmployee(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));

        // 1. Delete associated user login account (and their distributor redemptions, if any)
        userRepository.findByEmployeeId(id).ifPresent(user -> {
            redemptionRepository.deleteByDistributorId(user.getId());
            userRepository.delete(user);
        });

        // 2. Delete redemptions where this employee is the consumer
        redemptionRepository.deleteByEmployeeId(id);

        // 3. Delete employee profile
        employeeRepository.delete(employee);
    }

    public EmployeeResponse uploadPhoto(Long id, MultipartFile file) throws IOException {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", id));

        // Create upload directory if it doesn't exist
        Path uploadPath = Paths.get(photoDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : ".jpg";
        String filename = employee.getEmployeeCode() + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;

        // Delete old photo if exists
        if (employee.getPhotoPath() != null) {
            Path oldFile = uploadPath.resolve(employee.getPhotoPath());
            Files.deleteIfExists(oldFile);
        }

        // Save new photo
        Path targetPath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        employee.setPhotoPath(filename);
        employee = employeeRepository.save(employee);
        return toResponse(employee);
    }

    private EmployeeResponse toResponse(Employee e) {
        String photoUrl = e.getPhotoPath() != null
                ? "/uploads/photos/" + e.getPhotoPath()
                : null;

        return EmployeeResponse.builder()
                .id(e.getId())
                .employeeCode(e.getEmployeeCode())
                .name(e.getName())
                .department(e.getDepartment())
                .employeeType(e.getEmployeeType().name())
                .photoUrl(photoUrl)
                .active(e.getActive())
                .createdAt(e.getCreatedAt().format(FORMATTER))
                .build();
    }
}
