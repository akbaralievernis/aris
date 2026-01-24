import config from '../../config.js';

export const synthesizeWithGoogle = async ({ text }) => {
  const { apiKey, voice, audioEncoding } = config.tts.google;
  if (!apiKey) {
    throw new Error('GOOGLE_TTS_API_KEY is not configured');
  }

  const languageCode = voice?.split('-').slice(0, 2).join('-') || 'ky-KG';

  const requestBody = {
    input: { text },
    voice: {
      languageCode,
      name: voice
    },
    audioConfig: {
      audioEncoding
    }
  };

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google TTS failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data?.audioContent || '';
};
