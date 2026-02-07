-- FinDash: индексы (идемпотентно, можно запускать после bd.sql)
-- Ускоряют выборки по пользователю, типу актива, дате отчётов

-- users
CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);

-- user_favorites
CREATE INDEX IF NOT EXISTS idx_user_favorites_userId ON user_favorites(userId);
CREATE INDEX IF NOT EXISTS idx_user_favorites_type ON user_favorites(type);
CREATE INDEX IF NOT EXISTS idx_user_favorites_userId_type ON user_favorites(userId, type);

-- user_reports
CREATE INDEX IF NOT EXISTS idx_user_reports_userId ON user_reports(userId);
CREATE INDEX IF NOT EXISTS idx_user_reports_type ON user_reports(type);
CREATE INDEX IF NOT EXISTS idx_user_reports_createdAt ON user_reports(createdAt);
CREATE INDEX IF NOT EXISTS idx_user_reports_userId_createdAt ON user_reports(userId, createdAt DESC);
