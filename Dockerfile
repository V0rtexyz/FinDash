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
