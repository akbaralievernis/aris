# ARIS Production Refactor Plan

## 1) Текущий аудит (что есть / чего нет)

### Что уже есть (frontend)
- UI с настройкой провайдера Mistral/OpenAI и вводом API-ключа на клиенте (localStorage).【F:index.html†L149-L181】【F:js/api-manager.js†L24-L62】
- Голосовой ввод через Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).【F:js/speech-manager.js†L297-L356】
- Синтез речи через `window.speechSynthesis`, авто-выбор русского голоса.【F:js/speech-manager.js†L46-L140】
- Память/история через IndexedDB (таблицы conversations/memory/projects/apps).【F:js/database.js†L1-L85】

### Чего нет для prod
- Нет backend — ключи лежат на клиенте, запросы идут прямо в OpenAI/Mistral.【F:js/api-manager.js†L24-L218】
- Нет строгого кыргызского языка (есть русский/английский выбор голосов).【F:js/speech-manager.js†L121-L210】
- Нет централизованной памяти и краткого резюме (есть только клиентская память).【F:js/database.js†L1-L140】
- Нет защиты: rate limit, CORS, JWT/session, хранение ключей на сервере.

## 2) Целевая архитектура (текстовая диаграмма)

```
[GitHub Pages Frontend]
  - запись audio/webm
  - JWT токен
  - /api/turn
        |
        v
[Backend API (Node.js + Express)]
  - Auth (JWT)
  - Rate limit + CORS
  - STT -> текст (ky-KG)
  - LLM -> ответ (КЫРГЫЗЧА ONLY)
  - TTS -> audio (ky-KG)
  - Memory (SQLite/Postgres)
        |
        v
[DB]
  - sessions
  - messages
  - memory_summaries
```

## 3) Пошаговый план миграции
1. Добавить backend (Node.js + Express) с /api/turn и /api/auth/login.
2. Перенести ключи в `.env` и убрать ввод ключа с клиента.
3. Подключить STT/TTS и встроить языковые ограничения (ky-KG).
4. Подключить БД (SQLite/Postgres), хранить историю и summary.
5. Обновить frontend: запись audio/webm -> отправка на backend.
6. Включить безопасность: JWT, CORS allowlist, rate limit.
7. Задеплоить backend (Render/Railway/Fly) и связать домен.

## 4) Backend skeleton (Node.js + Express)

Структура (создана в `/backend`):
```
backend/
  src/
    server.js
    config.js
    prompt.js
    db.js
    memory.js
    middleware/auth.js
    routes/auth.js
    routes/turn.js
    services/
      llm/index.js
      stt/google.js
      stt/index.js
      tts/google.js
      tts/index.js
  sql/schema.sql
  .env.example
  package.json
```

### Основные фичи backend
- JWT авторизация (`/api/auth/login`).【F:backend/src/routes/auth.js†L1-L38】
- Rate limit + CORS + Helmet в API.【F:backend/src/server.js†L1-L38】
- STT (Google Speech-to-Text ky-KG).【F:backend/src/services/stt/google.js†L1-L33】
- TTS (Google Text-to-Speech ky-KG).【F:backend/src/services/tts/google.js†L1-L33】
- Строгий системный промпт и перезапрос, если не кыргызча.【F:backend/src/prompt.js†L1-L12】【F:backend/src/services/llm/index.js†L20-L57】
- Память + summary в SQLite.【F:backend/src/memory.js†L1-L46】
- Endpoint `/api/turn` принимает audio/webm или text, отвечает текст + base64 аудио.【F:backend/src/routes/turn.js†L1-L86】

## 5) Пример frontend-кода (audio/webm -> /api/turn)

```html
<button id="recordBtn">🎙 Record</button>
<audio id="playback" controls></audio>
```

```js
const recordBtn = document.getElementById('recordBtn');
const playback = document.getElementById('playback');
let mediaRecorder;
let chunks = [];

async function getToken() {
  const resp = await fetch('https://YOUR_BACKEND/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'change_me' })
  });
  const data = await resp.json();
  return data.token;
}

recordBtn.addEventListener('click', async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  chunks = [];

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', blob, 'voice.webm');
    formData.append('sessionId', crypto.randomUUID());

    const token = await getToken();
    const response = await fetch('https://YOUR_BACKEND/api/turn', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    const result = await response.json();
    const audioUrl = `data:audio/mp3;base64,${result.audioBase64}`;
    playback.src = audioUrl;
    playback.play();
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 4000);
});
```

## 6) Схема БД (SQLite/Postgres)

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE memory_summaries (
  session_id TEXT PRIMARY KEY,
  summary TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

Полная схема в `backend/sql/schema.sql`.【F:backend/sql/schema.sql†L1-L18】

## 7) Инструкции деплоя (Render / Railway / Fly)

### Render
1. Новый Web Service -> подключить репозиторий.
2. Root dir: `backend`, Build command: `npm install`, Start command: `npm start`.
3. Добавить переменные из `.env.example`.
4. Включить HTTPS, получить URL.
5. В GitHub Pages фронтенде указать `CORS_ORIGIN` и домен backend.

### Railway
1. New Project -> Deploy from GitHub.
2. Root dir: `backend`, Start command: `npm start`.
3. Настроить ENV, получить домен.

### Fly.io
1. `fly launch` в `backend/`.
2. `fly secrets set ...` по `.env.example`.
3. `fly deploy`.

### Подключение домена
- На стороне backend добавить custom domain (например, `api.aris.ai`).
- В GitHub Pages использовать этот домен в `CORS_ORIGIN` и запросах `/api/turn`.

## 8) Варианты STT/TTS (2 стека)

### A) Google STT (ky-KG) + Google TTS (ky-KG)
- STT: Google Speech-to-Text `languageCode=ky-KG`.
- TTS: Google Text-to-Speech voice `ky-KG-Standard-A`.

### B) Альтернатива (если Google недоступен)
- STT: OpenAI Whisper (multilingual, устойчивый к шуму).
- TTS: Azure Speech (ky-KG) или Coqui XTTS (кастомный кыргызский голос).

## 9) Политики безопасности (минимум)
- JWT авторизация через `/api/auth/login`.【F:backend/src/routes/auth.js†L1-L38】
- Rate limiting на API (60 req/min).【F:backend/src/server.js†L17-L27】
- CORS allowlist (GitHub Pages домен).【F:backend/src/server.js†L10-L16】
- Ключи в `.env`, не в клиенте.
