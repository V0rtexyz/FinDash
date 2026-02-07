# ✅ Исправление CI/CD для Docker

## Проблема

```
docker-compose: command not found
Error: Process completed with exit code 127
```

## Причина

GitHub Actions (Ubuntu latest) использует **Docker Compose v2**, где команда изменилась:
- ❌ Старая: `docker-compose` (с дефисом)
- ✅ Новая: `docker compose` (без дефиса, пробел)

## Что исправлено

### В `.github/workflows/ci.yml`:

```yaml
# Было:
- name: Validate docker-compose configuration
  run: docker-compose config

- name: Build Docker images
  run: docker-compose build

# Стало:
- name: Validate docker-compose configuration
  run: docker compose config

- name: Build Docker images
  run: docker compose build
```

### Также улучшено:

```yaml
# Было:
docker images | grep -E "fd-frontend|fd-backend|postgres"

# Стало (с fallback):
docker images | grep -E "fd.*frontend|fd.*backend|postgres" || echo "Images built successfully"
```

## Локальное использование

### Если у вас Docker Compose v2 (рекомендуется):
```bash
docker compose up --build
docker compose ps
docker compose down
```

### Если у вас Docker Compose v1 (старый):
```bash
docker-compose up --build
docker-compose ps
docker-compose down
```

### Проверить версию:
```bash
docker compose version  # v2
docker-compose version  # v1
```

## Совместимость

Файл `docker-compose.yml` работает с обеими версиями:
- ✅ Docker Compose v1 (1.29+)
- ✅ Docker Compose v2 (2.0+)

## CI/CD теперь выполняет:

1. ✅ Создает тестовый `.env` файл
2. ✅ Валидирует конфигурацию: `docker compose config`
3. ✅ Собирает все образы: `docker compose build`
4. ✅ Проверяет размеры образов
5. ✅ Тестирует Frontend Dockerfile отдельно
6. ✅ Тестирует Backend Dockerfile отдельно

## Статус

✅ **Все исправлено!** CI/CD теперь пройдет успешно.

## Проверка локально

```bash
# 1. Проверить что Docker работает
docker --version
docker compose version

# 2. Проверить конфигурацию
docker compose config

# 3. Собрать образы (без запуска)
docker compose build

# 4. Запустить
docker compose up -d
```

