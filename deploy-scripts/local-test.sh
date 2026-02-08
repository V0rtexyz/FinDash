#!/bin/bash

# FinDash Local Test with GHCR Images
# Использование: ./local-test.sh

set -e

echo "🧪 FinDash - Локальное тестирование с GHCR образами"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Проверка Docker
if ! command -v docker &> /dev/null; then
    error "Docker не установлен!"
    exit 1
fi

# Проверка docker-compose.prod.yml
if [ ! -f "docker-compose.prod.yml" ]; then
    error "docker-compose.prod.yml не найден!"
    echo "Запустите скрипт из корня проекта"
    exit 1
fi

# Проверка .env
if [ ! -f ".env" ]; then
    warn ".env файл не найден, создаем из примера..."
    cat > .env << 'EOF'
POSTGRES_USER=postgres
POSTGRES_PASSWORD=test_password
POSTGRES_DB=findash_test
POSTGRES_PORT=5432
BACKEND_PORT=3500
FRONTEND_PORT=8080
NODE_ENV=production
COINLAYER_API_KEY=test_key
ALPHA_VANTAGE_API_KEY=test_key
EOF
    log ".env файл создан"
fi

# Проверка SQL файлов
for file in bd.sql data.sql indexes.sql; do
    if [ ! -f "$file" ]; then
        warn "$file не найден, пропускаем..."
    fi
done

# Остановка существующих контейнеров
log "Остановка существующих контейнеров..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Очистка старых образов
log "Очистка старых образов..."
docker rmi ghcr.io/v0rtexyz/findash/frontend:latest 2>/dev/null || true
docker rmi ghcr.io/v0rtexyz/findash/backend:latest 2>/dev/null || true

# Pull свежих образов из GHCR
log "Загрузка образов из GHCR..."
echo ""
echo "Попытка загрузить образы:"
echo "  - ghcr.io/v0rtexyz/findash/frontend:latest"
echo "  - ghcr.io/v0rtexyz/findash/backend:latest"
echo ""

if docker compose -f docker-compose.prod.yml pull; then
    log "Образы успешно загружены"
else
    error "Не удалось загрузить образы из GHCR!"
    echo ""
    echo "Возможные причины:"
    echo "  1. Образы еще не опубликованы (первый push в main)"
    echo "  2. Образы приватные и нужен login:"
    echo "     docker login ghcr.io -u V0rtexyz"
    echo "  3. CI еще не завершился"
    echo ""
    echo "Проверьте: https://github.com/V0rtexyz/FinDash/packages"
    exit 1
fi

# Запуск контейнеров
log "Запуск контейнеров..."
if docker compose -f docker-compose.prod.yml up -d; then
    log "Контейнеры запущены"
else
    error "Ошибка при запуске контейнеров!"
    exit 1
fi

# Ожидание готовности
log "Ожидание готовности сервисов (30 сек)..."
sleep 30

# Статус
log "Статус контейнеров:"
docker compose -f docker-compose.prod.yml ps

# Health checks
echo ""
log "Проверка работоспособности:"

# Backend
echo -n "  Backend (http://localhost:3500/health): "
if curl -f -s http://localhost:3500/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Frontend
echo -n "  Frontend (http://localhost:8080): "
if curl -f -s http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Database
echo -n "  PostgreSQL: "
if docker exec findash-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Информация об образах
echo ""
log "Информация об образах:"
docker images | grep "ghcr.io/v0rtexyz/findash"

# Логи
echo ""
log "Последние логи (по 10 строк с каждого сервиса):"
echo ""
echo "═══ Backend ═══"
docker compose -f docker-compose.prod.yml logs --tail=10 backend
echo ""
echo "═══ Frontend ═══"
docker compose -f docker-compose.prod.yml logs --tail=10 frontend

# Итоги
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✅ Локальное тестирование завершено!"
echo ""
echo "🌐 Доступ:"
echo "   Frontend: http://localhost:8080"
echo "   Backend:  http://localhost:3500"
echo "   Health:   http://localhost:3500/health"
echo ""
echo "📋 Полезные команды:"
echo "   Логи:     docker compose -f docker-compose.prod.yml logs -f"
echo "   Статус:   docker compose -f docker-compose.prod.yml ps"
echo "   Остановка: docker compose -f docker-compose.prod.yml down"
echo "   Рестарт:  docker compose -f docker-compose.prod.yml restart"
echo ""

