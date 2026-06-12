-- Delete duplicate user accounts, keeping the one with the lowest id (the original)
DELETE FROM users 
WHERE id IN (
    SELECT id 
    FROM (
        SELECT id, 
               ROW_NUMBER() OVER (PARTITION BY employee_id ORDER BY id ASC) as rn
        FROM users
        WHERE employee_id IS NOT NULL
    ) t
    WHERE t.rn > 1
);

-- Add unique constraint on employee_id in the users table
ALTER TABLE users ADD CONSTRAINT uq_users_employee_id UNIQUE (employee_id);
