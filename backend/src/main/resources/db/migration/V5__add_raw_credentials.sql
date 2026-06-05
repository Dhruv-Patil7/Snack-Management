-- Add columns for plain text passwords/PINs
ALTER TABLE users ADD COLUMN password_raw VARCHAR(255);
ALTER TABLE users ADD COLUMN pin_raw VARCHAR(255);

-- Update existing default admin user's raw password
UPDATE users SET password_raw = 'admin123' WHERE username = 'admin';
