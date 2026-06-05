-- Seed default admin user
-- Password: admin123 (BCrypt hash)
INSERT INTO users (username, password_hash, role, active)
VALUES ('admin', '$2a$10$HEE1xrxZ76TtxumK7bZP9efBi/aG/BqsMmbFta7ymsIhDmlMOrRoC', 'ADMIN', true);
