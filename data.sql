-- FinDash: примеры данных для демо
-- Русские облигации, акции, криптовалюты в избранном (user_favorites)
-- Предполагается, что пользователи admin (id=1) и user (id=2) уже созданы через bd.sql

-- Избранное пользователя admin (id=1): облигации, акции, крипто
INSERT INTO user_favorites (userId, type, symbol) VALUES
(1, 'bond',  'ОФЗ 26238'),
(1, 'bond',  'ОФЗ 26235'),
(1, 'bond',  'СУ-35001'),
(1, 'stock', 'SBER'),
(1, 'stock', 'GAZP'),
(1, 'stock', 'YNDX'),
(1, 'stock', 'LKOH'),
(1, 'currency', 'BTC'),
(1, 'currency', 'ETH'),
(1, 'currency', 'USDT')
ON CONFLICT (userId, type, symbol) DO NOTHING;

-- Избранное пользователя user (id=2): часть акций и крипто
INSERT INTO user_favorites (userId, type, symbol) VALUES
(2, 'bond',  'ОФЗ 26238'),
(2, 'stock', 'SBER'),
(2, 'stock', 'TCSG'),
(2, 'currency', 'BTC'),
(2, 'currency', 'TON')
ON CONFLICT (userId, type, symbol) DO NOTHING;

-- Пример отчёта (JSONB)
INSERT INTO user_reports (userId, type, data) VALUES
(1, 'portfolio_summary', '{"date": "2025-02-02", "bonds": 3, "stocks": 4, "crypto": 3}'::jsonb),
(2, 'portfolio_summary', '{"date": "2025-02-02", "bonds": 1, "stocks": 2, "crypto": 2}'::jsonb);
