#!/bin/bash

# FinDash Auto-Update Script
# Использование: ./update.sh

set -e

echo "🚀 FinDash Deployment Update"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Директория проекта
PROJECT_DIR="/opt/findash"

# Проверка, что скрипт запущен из правильной директории
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ docker-compose.prod.yml не найден!${NC}"
    echo "Запустите скрипт из директории /opt/findash или скопируйте файлы"
    exit 1
fi

# Функция для логирования
log() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Проверка наличия docker
if ! command -v docker &> /dev/null; then
    error "Docker не установлен!"
    exit 1
fi

# Бэкап текущей версии (опционально)
log "Сохранение информации о текущей версии..."
docker compose -f docker-compose.prod.yml ps > .last-deploy-state 2>&1 || true

# Проверка текущих образов
log "Текущие образы:"
docker images | grep "ghcr.io/v0rtexyz/findash" || warn "Образы не найдены локально"

# Pull последних образов
log "Загрузка последних образов из GHCR..."
if docker compose -f docker-compose.prod.yml pull; then
    log "Образы успешно загружены"
else
    error "Ошибка при загрузке образов!"
    exit 1
fi

# Проверка изменений
log "Проверка обновлений..."
UPDATED=$(docker compose -f docker-compose.prod.yml pull 2>&1 | grep -c "Downloaded" || echo "0")

if [ "$UPDATED" -eq "0" ]; then
    warn "Новых обновлений не найдено. Образы уже актуальны."
else
    log "Найдено обновлений: $UPDATED"
fi

# Остановка старых контейнеров
log "Остановка текущих сервисов..."
docker compose -f docker-compose.prod.yml down

# Запуск обновленных контейнеров
log "Запуск обновленных сервисов..."
if docker compose -f docker-compose.prod.yml up -d; then
    log "Сервисы успешно запущены"
else
    error "Ошибка при запуске сервисов!"
    exit 1
fi

# Ожидание запуска
log "Ожидание готовности сервисов..."
sleep 5

# Проверка статуса
log "Проверка статуса сервисов:"
docker compose -f docker-compose.prod.yml ps

# Health checks
log "Проверка health checks..."

# Backend health
if curl -f -s http://localhost:3500/health > /dev/null 2>&1; then
    log "Backend: ✓ Работает"
else
    warn "Backend: ⚠ Не отвечает на health check"
fi

# Frontend health
if curl -f -s http://localhost > /dev/null 2>&1; then
    log "Frontend: ✓ Работает"
else
    warn "Frontend: ⚠ Не отвечает"
fi

# Очистка старых образов
log "Очистка неиспользуемых образов..."
docker image prune -af --filter "until=24h"

# Логи последних запусков
log "Последние логи:"
docker compose -f docker-compose.prod.yml logs --tail=20

# Сохранение информации о деплое
log "Сохранение информации о деплое..."
cat > .last-deploy-info << EOF
Deployment Date: $(date)
Images:
$(docker images | grep "ghcr.io/v0rtexyz/findash")

Services:
$(docker compose -f docker-compose.prod.yml ps)
EOF

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✅ Деплой завершен успешно!"
log "Frontend: http://localhost"
log "Backend: http://localhost:3500"
log "Health: http://localhost:3500/health"
echo ""
log "Для просмотра логов: docker compose -f docker-compose.prod.yml logs -f"
log "Для остановки: docker compose -f docker-compose.prod.yml down"

