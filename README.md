# ARIS — Интеллектуальный голосовой ассистент

ARIS — веб-ассистент с голосовым вводом, синтезом речи и памятью. Этот репозиторий содержит текущий GitHub Pages фронтенд и production-ready backend-скелет для безопасной архитектуры.

## 📌 Важно про безопасность
- Клиент **не должен** хранить API-ключи.
- Все запросы к LLM/STT/TTS идут через backend.
- JWT, CORS, rate limit — обязательны.

Полный аудит и план refactor см. в `docs/production-refactor.md`.【F:docs/production-refactor.md†L1-L201】

## 📁 Структура проекта
```
/
├── index.html
├── css/
├── js/
├── backend/
│   ├── src/
│   ├── sql/
│   ├── .env.example
│   └── package.json
└── docs/
    └── production-refactor.md
```

## 🚀 Запуск backend (Node.js)

### Вариант A (рекомендуется, из корня репозитория)
```bash
npm install
cp backend/.env.example backend/.env
npm start
```

### Вариант B (вручную из папки backend)
```bash
cd backend
npm install
cp .env.example .env
npm start
```

Backend стартует на `http://localhost:8080` и содержит:
- `/api/auth/login`
- `/api/turn`
- `/health`

Подробности по `.env` и настройке провайдеров см. в `docs/production-refactor.md`.【F:docs/production-refactor.md†L67-L201】

## 🌐 GitHub Pages frontend
Frontend остаётся статичным и должен отправлять аудио на `/api/turn` вашего backend. Пример кода отправки — в `docs/production-refactor.md`.【F:docs/production-refactor.md†L84-L135】

## 🧠 Память
Серверная память хранится в SQLite (по умолчанию) и содержит историю + summary. Схема в `backend/sql/schema.sql`.【F:backend/sql/schema.sql†L1-L18】

---

Если нужна помощь с внедрением альтернативных STT/TTS или деплоем — см. `docs/production-refactor.md`.【F:docs/production-refactor.md†L149-L201】
