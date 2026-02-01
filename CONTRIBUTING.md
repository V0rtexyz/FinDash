# Contributing

Спасибо за интерес к проекту! Ниже описаны правила контрибьюта и процесс работы.

## GitHub Flow

1. Создайте ветку от `main` (например, `feature/ci-stylelint`).
2. Вносите изменения только в своей ветке.
3. Откройте Pull Request в `main`.
4. Дождитесь прохождения CI и ревью.
5. После аппрува выполняйте merge через GitHub.

## Запрет прямых коммитов в main

Не коммитьте напрямую в `main`. Все изменения должны проходить через Pull Request.

## Проверки перед PR

Запускайте проверки локально (из `frontend/`):

```bash
npm ci
npm run lint
npm run prettier:check
npm run stylelint:check
npm run test:unit:coverage
npm run test:e2e
```

## Стиль кода

- ESLint обязателен для TypeScript/JavaScript.
- Prettier обязателен для форматирования.
- Stylelint обязателен для CSS.