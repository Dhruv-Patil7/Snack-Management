-- V9: Add plant_area column to redemptions for tracking distribution location per redemption
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS plant_area VARCHAR(50);
