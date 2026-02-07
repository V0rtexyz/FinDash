# 🐳 Быстрый запуск через Docker

## Команды

### Запуск проекта:

```bash
# 1. Создать .env файл (скопировать env.template)
cp env.template .env

# 2. Отредактировать .env - добавить:
# - POSTGRES_PASSWORD (любой пароль)
# - COINLAYER_API_KEY
# - ALPHA_VANTAGE_API_KEY

# 3. Запустить все сервисы
docker compose up --build

# Или в фоне:
docker compose up -d --build
```

### Проверка:

```bash
# Статус контейнеров
docker compose ps

# Логи
docker compose logs -f

# Только backend логи
docker compose logs -f backend
```

### Остановка:

```bash
# Остановить
docker compose down

# Остановить + удалить данные БД
docker compose down -v
```

## Доступ

- Frontend: http://localhost
- Backend API: http://localhost:3500
- Health: http://localhost:3500/health

## Где получить API ключи

- **CoinLayer**: https://coinlayer.com/ (бесплатная регистрация)
- **Alpha Vantage**: https://www.alphavantage.co/support/#api-key (бесплатная регистрация)

## Важно

**Docker Compose v2 vs v1:**
- Используйте `docker compose` (v2, без дефиса)
- Не `docker-compose` (v1, устаревший)

GitHub Actions использует Docker Compose v2 по умолчанию.

## Архитектура

```
Frontend (Nginx) :80
    ↓
Backend (Node.js) :3500
    ↓
PostgreSQL :5432 (с автоматической инициализацией)
```

## CI/CD

При push в GitHub автоматически:
1. ✅ Lint & Format
2. ✅ Unit Tests
3. ✅ E2E Tests
4. ✅ Docker Build (все образы)

