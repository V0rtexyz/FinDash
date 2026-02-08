#!/bin/bash

# FinDash Initial Server Setup
# Использование: sudo bash initial-setup.sh

set -e

echo "🎯 FinDash - Initial Server Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Проверка root прав
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с sudo"
    exit 1
fi

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Обновление системы
log "Обновление системы..."
apt update && apt upgrade -y

# 2. Установка необходимых пакетов
log "Установка необходимых пакетов..."
apt install -y \
    curl \
    wget \
    git \
    ufw \
    nginx \
    certbot \
    python3-certbot-nginx

# 3. Установка Docker
if ! command -v docker &> /dev/null; then
    log "Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    log "Docker установлен"
else
    log "Docker уже установлен"
fi

# 4. Установка Docker Compose v2
log "Проверка Docker Compose..."
if ! docker compose version &> /dev/null; then
    warn "Docker Compose не найден, устанавливаем плагин..."
    apt install -y docker-compose-plugin
fi

# 5. Настройка пользователя
log "Настройка пользователя для Docker..."
read -p "Введите имя пользователя (не root): " USERNAME

if id "$USERNAME" &>/dev/null; then
    usermod -aG docker $USERNAME
    log "Пользователь $USERNAME добавлен в группу docker"
else
    warn "Пользователь $USERNAME не найден, пропускаем..."
fi

# 6. Создание директории проекта
log "Создание директории проекта..."
mkdir -p /opt/findash
chown -R $USERNAME:$USERNAME /opt/findash 2>/dev/null || true
cd /opt/findash

# 7. Настройка firewall
log "Настройка firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3500/tcp  # Backend API (опционально, если нужен прямой доступ)
echo "y" | ufw enable

# 8. Настройка systemd для автозапуска
log "Создание systemd service..."
cat > /etc/systemd/system/findash.service << 'EOF'
[Unit]
Description=FinDash Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/findash
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
log "Systemd service создан"

# 9. Настройка логирования
log "Настройка логирования..."
mkdir -p /var/log/findash
chown -R $USERNAME:$USERNAME /var/log/findash 2>/dev/null || true

# 10. Настройка ротации логов Docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

systemctl restart docker

# 11. Создание .env template
log "Создание .env template..."
cat > /opt/findash/.env.example << 'EOF'
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_ME_SECURE_PASSWORD
POSTGRES_DB=findash
POSTGRES_PORT=5432

# Backend
BACKEND_PORT=3500
NODE_ENV=production

# Frontend
FRONTEND_PORT=80

# API Keys
COINLAYER_API_KEY=your_coinlayer_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
EOF

chown $USERNAME:$USERNAME /opt/findash/.env.example 2>/dev/null || true

# 12. Создание скрипта для быстрого деплоя
log "Создание скрипта обновления..."
mkdir -p /opt/findash/scripts
cat > /opt/findash/scripts/deploy.sh << 'DEPLOYEOF'
#!/bin/bash
cd /opt/findash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker image prune -af
echo "✅ Деплой завершен!"
DEPLOYEOF

chmod +x /opt/findash/scripts/deploy.sh
chown -R $USERNAME:$USERNAME /opt/findash/scripts 2>/dev/null || true

# 13. Информация о завершении
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✅ Сервер настроен успешно!"
echo ""
echo "📋 СЛЕДУЮЩИЕ ШАГИ:"
echo ""
echo "1. Скопируйте файлы на сервер:"
echo "   scp docker-compose.prod.yml $USERNAME@$(hostname -I | awk '{print $1}'):/opt/findash/"
echo "   scp bd.sql data.sql indexes.sql $USERNAME@$(hostname -I | awk '{print $1}'):/opt/findash/"
echo ""
echo "2. Настройте .env файл:"
echo "   cd /opt/findash"
echo "   cp .env.example .env"
echo "   nano .env"
echo ""
echo "3. Залогиньтесь в GHCR (если образы приватные):"
echo "   docker login ghcr.io -u V0rtexyz"
echo ""
echo "4. Запустите приложение:"
echo "   cd /opt/findash"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "5. Проверьте статус:"
echo "   docker compose -f docker-compose.prod.yml ps"
echo "   curl http://localhost:3500/health"
echo ""
echo "6. Настройте домен и SSL (опционально):"
echo "   sudo certbot --nginx -d yourdomain.com"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Установленные сервисы:"
echo "   - Docker: $(docker --version)"
echo "   - Docker Compose: $(docker compose version)"
echo "   - Nginx: $(nginx -v 2>&1)"
echo "   - UFW: $(ufw status | head -1)"
echo ""
log "Директория проекта: /opt/findash"
log "Systemd service: findash.service"
echo ""

