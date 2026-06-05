-- Seed default admin user
-- Password: admin123 (BCrypt hash)
INSERT INTO users (username, password_hash, role, active)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN', true);
