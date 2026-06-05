-- Redemptions table
CREATE TABLE redemptions (
    id              BIGSERIAL PRIMARY KEY,
    employee_id     BIGINT       NOT NULL REFERENCES employees(id),
    distributor_id  BIGINT       NOT NULL REFERENCES users(id),
    session         VARCHAR(10)  NOT NULL,
    redemption_mode VARCHAR(20)  NOT NULL,
    redeemed_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Critical: one redemption per employee per session per day
CREATE UNIQUE INDEX idx_redemptions_unique_daily
    ON redemptions(employee_id, session, CAST(redeemed_at AS DATE));

CREATE INDEX idx_redemptions_date ON redemptions(redeemed_at);
CREATE INDEX idx_redemptions_employee ON redemptions(employee_id);
CREATE INDEX idx_redemptions_distributor ON redemptions(distributor_id);
CREATE INDEX idx_redemptions_session ON redemptions(session);
