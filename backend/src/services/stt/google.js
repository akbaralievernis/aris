import config from '../../config.js';

export const transcribeWithGoogle = async ({ audioBuffer, mimeType }) => {
  const { apiKey, language, sampleRate } = config.stt.google;
  if (!apiKey) {
    throw new Error('GOOGLE_CLOUD_API_KEY is not configured');
  }

  const audioContent = audioBuffer.toString('base64');
  const requestBody = {
    config: {
      encoding: mimeType?.includes('webm') ? 'WEBM_OPUS' : 'LINEAR16',
      sampleRateHertz: sampleRate,
      languageCode: language,
      enableAutomaticPunctuation: true,
      model: 'latest_long'
    },
    audio: {
      content: audioContent
    }
  };

  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google STT failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const transcript = data?.results?.map((r) => r.alternatives?.[0]?.transcript).join(' ').trim();
  return transcript || '';
};
