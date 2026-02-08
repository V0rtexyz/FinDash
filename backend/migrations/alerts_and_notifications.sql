-- Alerts and notifications tables for FinDash
-- Run after bd.sql: psql -d findash -f backend/migrations/alerts_and_notifications.sql

CREATE TABLE IF NOT EXISTS user_alerts (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'currency' CHECK (type IN ('currency', 'stock', 'crypto')),
    symbol VARCHAR(50) NOT NULL,
    alertCondition VARCHAR(20) NOT NULL CHECK (alertCondition IN ('above', 'below')),
    targetValue DECIMAL(20, 8) NOT NULL,
    isActive BOOLEAN NOT NULL DEFAULT true,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alertId INTEGER REFERENCES user_alerts(id) ON DELETE SET NULL,
    message VARCHAR(500) NOT NULL,
    readAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_userId ON user_alerts(userId);
CREATE INDEX IF NOT EXISTS idx_user_alerts_symbol ON user_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_user_alerts_active ON user_alerts(isActive) WHERE isActive = true;
CREATE INDEX IF NOT EXISTS idx_user_notifications_userId ON user_notifications(userId);
CREATE INDEX IF NOT EXISTS idx_user_notifications_readAt ON user_notifications(readAt);
