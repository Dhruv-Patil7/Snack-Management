package com.snackmgmt.service;

import com.snackmgmt.entity.DailyMenu;
import com.snackmgmt.enums.SnackSession;
import com.snackmgmt.repository.DailyMenuRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final DailyMenuRepository dailyMenuRepository;

    private static final List<String> ALLOWED_SNACKS = List.of(
            "Samosa",
            "Vada",
            "Puri Sabji",
            "Kachori",
            "Upma",
            "Aloo Bonda"
    );

    public String getTodaySnack(SnackSession session) {
        return dailyMenuRepository.findByMenuDateAndSession(LocalDate.now(), session)
                .map(DailyMenu::getSnackName)
                .orElse("");
    }

    @Transactional
    public String setTodaySnack(SnackSession session, String snackName) {
        if (snackName == null || snackName.trim().isEmpty()) {
            throw new IllegalArgumentException("Snack name is required");
        }

        String matchedSnackName = ALLOWED_SNACKS.stream()
                .filter(s -> s.equalsIgnoreCase(snackName.trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Invalid snack selection. Allowed snacks: " + ALLOWED_SNACKS));

        LocalDate today = LocalDate.now();
        DailyMenu dailyMenu = dailyMenuRepository.findByMenuDateAndSession(today, session)
                .orElse(DailyMenu.builder()
                        .menuDate(today)
                        .session(session)
                        .build());

        dailyMenu.setSnackName(matchedSnackName);
        dailyMenuRepository.save(dailyMenu);
        return matchedSnackName;
    }

    public List<String> getAllowedSnacks() {
        return ALLOWED_SNACKS;
    }
}
