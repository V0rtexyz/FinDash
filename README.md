# FinDash

**FinDash** — веб-приложение для визуализации курсов валют, акций и криптовалют в реальном времени. Дашборд финансовых показателей по аналогии с Т‑Инвестиции: отслеживание российских облигаций, акций и криптовалют.

**Быстрый старт:** клонируй репозиторий → установи зависимости (`npm install`, в `frontend` — `npm ci`) → настрой БД ([bd.sql](./bd.sql), [DBREADME.md](./DBREADME.md)) и [переменные окружения](#переменные-окружения) → запусти backend (`npm run dev`) и frontend (`cd frontend && npm run dev`). Подробно — в разделе [Установка и запуск](#установка-и-запуск).

---

## Содержание

- [Возможности](#возможности)
- [Стек технологий](#стек-технологий)
- [Структура проекта](#структура-проекта)
- [Требования](#требования)
- [Установка и запуск](#установка-и-запуск)
- [Переменные окружения](#переменные-окружения)
- [База данных](#база-данных)
- [API](#api)
- [Аналитика](#аналитика)
- [Тестирование](#тестирование)
- [CI/CD](#cicd)
- [Участие в разработке](#участие-в-разработке)
- [Документация по проекту](#документация-по-проекту)

---

## Возможности

- **Авторизация** — вход по логину и паролю, защищённые маршруты.
- **Графики валют** — отображение курсов в реальном времени (Chart.js).
- **Отслеживаемые активы** — добавление валют, акций и облигаций в избранное.
- **Сортировка и фильтрация** — по типу актива и символу.
- **Отчёты** — формирование и скачивание отчётов (PDF).
- **Сравнение курсов** — визуализация и сравнение выбранных инструментов.
- **Real-time обновления** — WebSocket для обмена данными с сервером.

---

## Стек технологий

### Frontend

| Технология | Назначение |
|------------|------------|
| **React** | UI и компонентная модель |
| **TypeScript** | Типизация |
| **Vite** | Сборка и dev-сервер |
| **Redux** | Глобальный стейт |
| **React Router** | Маршрутизация |
| **Chart.js** + **react-chartjs-2** | Отрисовка графиков |
| **WebSocket** | Обмен данными в реальном времени |
| **ESLint** + **Prettier** + **Stylelint** | Линтинг и форматирование |
| **Sentry** | Мониторинг ошибок |
| **Яндекс.Метрика** | Сбор аналитики по проекту |

### Backend

| Технология | Назначение |
|------------|------------|
| **Node.js** + **Express** | HTTP API и WebSocket-сервер |
| **PostgreSQL** | Хранение пользователей, избранного и отчётов |
| **CoinLayer API** | Данные по валютам и криптовалютам |
| **Alpha Vantage API** | Данные по акциям |
| **crypto** (Node) | Хеширование паролей |

### Тесты и инфраструктура

| Технология | Назначение |
|------------|------------|
| **Jest** + **React Testing Library** | Unit-тесты |
| **Playwright** | E2E-тесты |
| **Docker** | Сборка образа для деплоя |
| **GitHub Actions** | CI: lint, unit, e2e, docker build |

---

## Структура проекта

```
FinDash/
├── backend/                 # Node.js API и WebSocket
│   ├── routes/              # Маршруты: auth, currency, stock, favorites, report
│   ├── services/            # Database, Auth, CoinLayer, AlphaVantage, Report
│   └── server.js
├── frontend/                # React SPA (Vite)
│   ├── src/
│   │   ├── components/      # UI-компоненты (Dashboard, Charts, Reports, YandexMetrika…)
│   │   ├── context/         # Auth, Currency, CurrencyList, Report
│   │   ├── services/       # API, WebSocket, Auth, Report, Storage
│   │   ├── styles/
│   │   └── types/
│   ├── index.html
│   └── vite.config.ts
├── tests/e2e/               # Playwright E2E
├── bd.sql                   # Схема БД и индексы
├── data.sql                 # Примеры данных
├── indexes.sql              # Отдельный скрипт индексов
├── SCHEMA.md                # Описание схемы БД (таблицы, связи, индексы)
├── DBREADME.md              # Работа с БД и скриптами
└── CONTRIBUTING.md          # Правила контрибьюта
```

---

## Требования

- **Node.js** 22.x (указано в CI)
- **PostgreSQL** 12+
- Аккаунты и ключи: CoinLayer, Alpha Vantage (опционально — Sentry, Яндекс.Метрика)

---

## Установка и запуск

### 1. Клонирование и зависимости

```bash
git clone <repo-url>
cd FinDash
npm install
cd frontend && npm ci
```

### 2. База данных

```bash
createdb findash
psql -d findash -f bd.sql
psql -d findash -f data.sql   # опционально — демо-данные
```

Подробнее: [DBREADME.md](./DBREADME.md) и [SCHEMA.md](./SCHEMA.md).

### 3. Переменные окружения

Рекомендуется добавить `.env` в `.gitignore` и не коммитить файлы с ключами. Создайте `.env` в корне и/или `backend/.env`. Минимум для backend:

```env
PORT=3500
DATABASE_URL=postgresql://user:password@localhost:5432/findash
COINLAYER_API_KEY=your_key
ALPHA_VANTAGE_API_KEY=your_key
```

Для frontend в `frontend/.env`:

```env
VITE_SENTRY_DSN=          # опционально
VITE_YANDEX_METRIKA_ID=   # ID счётчика Метрики для аналитики
```

### 4. Запуск

**Backend:**

```bash
npm run dev
# или: node backend/server.js
```

Сервер по умолчанию: `http://localhost:3500`.

**Frontend:**

```bash
cd frontend
npm run dev
```

Приложение: `http://localhost:5173`. Запросы к `/api` проксируются на backend (настроено в `vite.config.ts`).

---

## Переменные окружения

| Переменная | Где | Описание |
|------------|-----|----------|
| `PORT` | backend | Порт сервера (по умолчанию 3500) |
| `NODE_ENV` | backend | `development` / `production` |
| `DATABASE_URL` | backend | URL подключения к PostgreSQL |
| `COINLAYER_API_KEY` | backend | Ключ CoinLayer API |
| `ALPHA_VANTAGE_API_KEY` | backend | Ключ Alpha Vantage API |
| `VITE_SENTRY_DSN` | frontend | DSN Sentry (опционально) |
| `VITE_YANDEX_METRIKA_ID` | frontend | ID счётчика Яндекс.Метрики для полной статистики проекта |

---

## База данных

- **Таблицы:** `users`, `user_favorites`, `user_reports`.
- **Связи:** пользователь → избранное (CASCADE), пользователь → отчёты (CASCADE).
- **Типы активов в избранном:** `currency`, `stock`, `bond`.

Подробная схема, ER-диаграмма, индексы и ограничения — в [SCHEMA.md](./SCHEMA.md).  
Скрипты и тестовые пользователи — в [DBREADME.md](./DBREADME.md).

---

## API

Базовый URL: `http://localhost:3500` (или ваш хост). Полный список эндпоинтов с примерами возвращает `GET /api`.

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Информация о сервере и ссылки на API |
| GET | `/health` | Проверка состояния сервера и подключений |
| GET | `/api` | Описание всех API-эндпоинтов |
| POST | `/api/auth/login` | Вход (login, password / passwordHash) |
| POST | `/api/auth/register` | Регистрация |
| GET | `/api/currencies` | Список валют |
| GET | `/api/currencies/rates` | Курсы (query: `symbols`) |
| GET | `/api/currencies/historical/:date` | Исторические курсы |
| GET | `/api/currencies/timeseries/:symbol` | Временной ряд по валюте |
| GET | `/api/stocks/quote/:symbol` | Котировка акции |
| GET | `/api/stocks/timeseries/:symbol` | Временной ряд по акции |
| GET | `/api/stocks/search` | Поиск инструментов (query: `keywords`) |
| POST | `/api/stocks/quotes` | Котировки нескольких акций |
| GET | `/api/favorites` | Список избранного (query: `userId`, `type`) |
| POST | `/api/favorites` | Добавить в избранное |
| DELETE | `/api/favorites` | Удалить из избранного |
| GET | `/api/reports` | Список отчётов пользователя |
| POST | `/api/reports/currency-comparison` | Отчёт сравнения валют |
| POST | `/api/reports/portfolio` | Отчёт по портфелю |
| GET | `/api/reports/:reportId/download` | Скачать отчёт (query: `userId`, `format`) |

WebSocket: подключение к `ws://localhost:3500` для real-time обновлений.

---

## Аналитика

Для полной статистики по проекту подключена **Яндекс.Метрика**.

1. Создайте счётчик в [Яндекс.Метрике](https://metrika.yandex.ru/).
2. В `frontend/.env` задайте:
   ```env
   VITE_YANDEX_METRIKA_ID=XXXXXXXX
   ```
3. В приложении автоматически:
   - подгружается `tag.js`;
   - инициализируется счётчик с вебвизором, картой кликов и точным показателем отказов;
   - отправляется хит для первой открытой страницы и при каждой смене маршрута (SPA), так что в Метрике учитываются все разделы.

Компонент трекинга: `frontend/src/components/YandexMetrika.tsx`. Без `VITE_YANDEX_METRIKA_ID` метрика не инициализируется, приложение работает как раньше.

**Подробно:** архитектура, что считается, пошаговый запуск и отчёты — в [YANDEX_METRIKA.md](./YANDEX_METRIKA.md).

---

## Тестирование

Из каталога `frontend/`:

```bash
npm run lint              # ESLint
npm run prettier:check    # Prettier
npm run stylelint:check   # Stylelint
npm run test:unit         # Jest unit-тесты
npm run test:unit:coverage # С покрытием
npm run test:e2e          # Playwright E2E
```

Перед PR рекомендуется выполнить все проверки из [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):

1. **Lint** — ESLint, Prettier, Stylelint.
2. **Unit tests** — Jest с загрузкой артефакта покрытия.
3. **E2E** — Playwright (Chromium).
4. **Docker build** — только для ветки `main` после успешных тестов.

В `main` коммиты только через Pull Request; локально проверяйте тесты и линтеры перед пушем.

---

## Участие в разработке

- Ветки от `main`, все изменения через Pull Request.
- Перед PR: `npm ci`, lint, prettier, stylelint, unit (с coverage), e2e в `frontend/`.
- Стиль кода: ESLint, Prettier, Stylelint обязательны.

Подробности: [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Документация по проекту

| Документ | Содержание |
|----------|------------|
| [README.md](./README.md) | Обзор проекта, стек, запуск, API, аналитика (этот файл) |
| [YANDEX_METRIKA.md](./YANDEX_METRIKA.md) | **Яндекс.Метрика:** архитектура, что считается, как запустить, отчёты |
| [SCHEMA.md](./SCHEMA.md) | Схема БД: таблицы, связи, индексы, типы активов |
| [DBREADME.md](./DBREADME.md) | Скрипты БД, тестовые пользователи, быстрый старт |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | GitHub Flow, проверки перед PR, стиль кода |

---

*FinDash — дашборд финансовых показателей. React, Vite, Node.js, PostgreSQL, Яндекс.Метрика.*
