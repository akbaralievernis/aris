import dotenv from 'dotenv';

dotenv.config();

const required = (key, fallback = undefined) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    return undefined;
  }
  return value;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  corsOrigin: required('CORS_ORIGIN', '*'),
  jwtSecret: required('JWT_SECRET', 'change-this-secret'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '7d'),
  adminUser: required('ADMIN_USER', 'admin'),
  adminPassword: required('ADMIN_PASSWORD'),
  adminPasswordHash: required('ADMIN_PASSWORD_HASH'),
  llm: {
    provider: required('LLM_PROVIDER', 'openai'),
    baseUrl: required('LLM_BASE_URL', 'https://api.openai.com/v1'),
    apiKey: required('LLM_API_KEY'),
    model: required('LLM_MODEL', 'gpt-4o-mini')
  },
  stt: {
    provider: required('STT_PROVIDER', 'google'),
    google: {
      projectId: required('GOOGLE_CLOUD_PROJECT_ID'),
      apiKey: required('GOOGLE_CLOUD_API_KEY'),
      language: required('GOOGLE_STT_LANGUAGE', 'ky-KG'),
      sampleRate: Number(process.env.GOOGLE_STT_SAMPLE_RATE || 48000)
    }
  },
  tts: {
    provider: required('TTS_PROVIDER', 'google'),
    google: {
      apiKey: required('GOOGLE_TTS_API_KEY'),
      voice: required('GOOGLE_TTS_VOICE', 'ky-KG-Standard-A'),
      audioEncoding: required('GOOGLE_TTS_AUDIO_ENCODING', 'MP3')
    }
  },
  memory: {
    dbPath: required('DB_PATH', './data/aris.sqlite'),
    summaryInterval: Number(process.env.MEMORY_SUMMARY_INTERVAL || 10),
    maxTurnsContext: Number(process.env.MAX_TURNS_CONTEXT || 12)
  }
};

export default config;
