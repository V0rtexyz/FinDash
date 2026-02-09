# -------- 1. Build stage --------
FROM node:24-alpine AS build

WORKDIR /app/frontend

# Инструменты, нужные для node-gyp (ТОЛЬКО на этапе сборки)
RUN apk add --no-cache python3 make g++

# Устанавливаем зависимости
COPY frontend/package*.json ./
RUN npm ci

# Копируем код и собираем фронт
COPY frontend/ ./
RUN rm -f node_modules/.bin/node && npm run build

# -------- 2. Runtime stage --------
FROM nginx:alpine

# Копируем собранный фронт в nginx
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Копируем nginx конфигурацию с проксированием на backend
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт
EXPOSE 8080

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]