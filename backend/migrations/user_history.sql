-- User history table (просмотренные валюты/акции)
CREATE TABLE IF NOT EXISTS user_history (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('currency', 'stock')),
    symbol VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    price DECIMAL(20, 8),
    change24h DECIMAL(10, 4),
    viewedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, type, symbol)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_history_userId ON user_history(userId);
CREATE INDEX IF NOT EXISTS idx_user_history_userId_viewedAt ON user_history(userId, viewedAt DESC);
CREATE INDEX IF NOT EXISTS idx_user_history_type ON user_history(type);

-- Update viewedAt on duplicate
CREATE OR REPLACE FUNCTION update_user_history_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.viewedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_history_update_timestamp
BEFORE UPDATE ON user_history
FOR EACH ROW
EXECUTE FUNCTION update_user_history_timestamp();


