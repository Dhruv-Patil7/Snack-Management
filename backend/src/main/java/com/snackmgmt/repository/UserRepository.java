package com.snackmgmt.repository;

import com.snackmgmt.entity.User;
import com.snackmgmt.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    Optional<User> findByEmployeeId(Long employeeId);

    List<User> findByRole(Role role);

    List<User> findByActiveTrue();
}
