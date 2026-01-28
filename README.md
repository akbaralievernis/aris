# ARIS — Кыргызча үн жардамчы (Next.js)

ARIS — браузерде иштеген кыргыз тилиндеги үн жардамчы. Wake word (beta) жана push‑to‑talk режимдери, VAD негизиндеги сүйлөө токтотуу, барж-ин (TTS ойнотулуп жатканда сүйлөп жиберсеңиз кайра угуу) жана сервер тарабында коопсуз сакталган API ачкычтары менен иштейт.

## Өзгөчөлүктөр

- Wake word (beta) жана push‑to‑talk (default, ишенимдүү).
- VAD: ~900мс тынчтыкта автоматтык токтотуу.
- Barge‑in: TTS ойнотулуп жатканда сүйлөп жиберсеңиз, TTS токтоп кайра угат.
- Kyrgyz-only жооптор (сервердик валидатор менен).
- Server‑managed key (default) жана per‑user key (AES‑256‑GCM менен шифрленип сакталат).
- Prisma + PostgreSQL + NextAuth (email/password).

## Техникалык стек

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL
- NextAuth (Credentials)
- OpenAI: STT (Whisper), LLM, TTS

## Файл дарагы (негизги бөлүктөр)

```
app/
  api/
    auth/
      [...nextauth]/route.ts
      register/route.ts
    user/secret/route.ts
    voice/route.ts
  login/page.tsx
  register/page.tsx
  settings/page.tsx
  page.tsx
components/
  VoiceAssistant.tsx
lib/
  auth.ts
  crypto.ts
  kyrgyz.ts
  prisma.ts
  provider.ts
  rate-limit.ts
prisma/
  schema.prisma
```

## Айлана‑чөйрө өзгөрмөлөрү

```
DATABASE_URL="postgresql://user:password@localhost:5432/aris"
NEXTAUTH_SECRET="<random-32+chars>"
NEXTAUTH_URL="http://localhost:3000"
MASTER_KEY="<base64-encoded-32-bytes>"
OPENAI_API_KEY="<server-managed-key>"
```

> `MASTER_KEY` мисал: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

## Иштетүү

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Коопсуздук

- API ачкычтары браузерге берилбейт.
- Per‑user key AES‑256‑GCM менен шифрленип, DB'де сакталат.
- Rate limit жана аудио көлөм чектөөсү бар.

## Эскертүү

Wake word режими Web Speech API'ге таянат жана бардык браузерлерде ишенимдүү эмес. Push‑to‑talk режимин сунуштайбыз.
