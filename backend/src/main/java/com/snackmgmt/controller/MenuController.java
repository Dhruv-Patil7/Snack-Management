package com.snackmgmt.controller;

import com.snackmgmt.enums.SnackSession;
import com.snackmgmt.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/menu")
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    @GetMapping("/today")
    public ResponseEntity<Map<String, Object>> getTodayMenu() {
        return ResponseEntity.ok(Map.of(
                "morningSnack", menuService.getTodaySnack(SnackSession.MORNING),
                "eveningSnack", menuService.getTodaySnack(SnackSession.EVENING),
                "nightSnack", menuService.getTodaySnack(SnackSession.NIGHT),
                "allowedSnacks", menuService.getAllowedSnacks()
        ));
    }

    @PostMapping("/today")
    public ResponseEntity<Map<String, String>> setTodayMenu(@RequestBody Map<String, String> request) {
        try {
            String sessionStr = request.get("session");
            String snackName = request.get("snackName");
            if (sessionStr == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Session is required"));
            }
            SnackSession session = SnackSession.valueOf(sessionStr.toUpperCase());
            String savedSnack = menuService.setTodaySnack(session, snackName);
            return ResponseEntity.ok(Map.of("session", session.name(), "snackName", savedSnack));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
