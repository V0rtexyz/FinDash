
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

# Открываем порт
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
=======
# FinDash — образ backend (API + WebSocket).
# Frontend собирается отдельно (Vite). Переменные окружения передаются при запуске.
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY backend ./backend

EXPOSE 3500

CMD ["node", "backend/server.js"]
