-- Seed default admin user
-- Password: admin123 (BCrypt hash)
INSERT INTO users (username, password_hash, role, active)
VALUES ('admin', 'admin123', 'ADMIN', true);
