package com.snackmgmt.repository;

import com.snackmgmt.entity.DailyMenu;
import com.snackmgmt.enums.SnackSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface DailyMenuRepository extends JpaRepository<DailyMenu, Long> {
    Optional<DailyMenu> findByMenuDateAndSession(LocalDate menuDate, SnackSession session);
}
