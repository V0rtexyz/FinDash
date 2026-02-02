- FinDash Database Schema
-- PostgreSQL database schema for FinDash application

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(255) UNIQUE NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User favorites table (tracked currencies and stocks)
CREATE TABLE IF NOT EXISTS user_favorites (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('currency', 'stock', 'bond')),
    symbol VARCHAR(50) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, type, symbol)
);

-- User reports table
CREATE TABLE IF NOT EXISTS user_reports (
    id SERIAL PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
CREATE INDEX IF NOT EXISTS idx_user_favorites_userId ON user_favorites(userId);
CREATE INDEX IF NOT EXISTS idx_user_favorites_type ON user_favorites(type);
CREATE INDEX IF NOT EXISTS idx_user_favorites_userId_type ON user_favorites(userId, type);
CREATE INDEX IF NOT EXISTS idx_user_reports_userId ON user_reports(userId);
CREATE INDEX IF NOT EXISTS idx_user_reports_type ON user_reports(type);
CREATE INDEX IF NOT EXISTS idx_user_reports_createdAt ON user_reports(createdAt);
CREATE INDEX IF NOT EXISTS idx_user_reports_userId_createdAt ON user_reports(userId, createdAt DESC);

-- Insert default admin user (password: "admin" hashed with SHA256)
-- Password hash: 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
INSERT INTO users (login, passwordHash) 
VALUES ('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918')
ON CONFLICT (login) DO NOTHING;

-- Insert default user (password: "user" hashed with SHA256)
-- Password hash: 04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb
INSERT INTO users (login, passwordHash) 
VALUES ('user', '04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb')
ON CONFLICT (login) DO NOTHING;