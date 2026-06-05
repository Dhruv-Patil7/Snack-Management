-- Employees table
CREATE TABLE employees (
    id              BIGSERIAL PRIMARY KEY,
    employee_code   VARCHAR(50)  NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    department      VARCHAR(100),
    employee_type   VARCHAR(20)  NOT NULL DEFAULT 'OFFICE',
    photo_path      VARCHAR(500),
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_code ON employees(employee_code);
CREATE INDEX idx_employees_name ON employees(LOWER(name));
CREATE INDEX idx_employees_type ON employees(employee_type);
CREATE INDEX idx_employees_active ON employees(active);
