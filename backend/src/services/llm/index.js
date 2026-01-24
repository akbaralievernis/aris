import config from '../../config.js';

const buildHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${config.llm.apiKey}`
});

const requestJson = async (url, payload) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${errorText}`);
  }

  return response.json();
};

const kyrgyzRegex = /[а-яёңүө]/i;
const latinRegex = /[a-z]/i;

const enforceKyrgyz = (text) => {
  if (!text) return false;
  return kyrgyzRegex.test(text) && !latinRegex.test(text);
};

export const callLLM = async ({ systemPrompt, messages }) => {
  if (!config.llm.apiKey) {
    throw new Error('LLM_API_KEY is not configured');
  }

  const url = `${config.llm.baseUrl}/chat/completions`;
  const payload = {
    model: config.llm.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    temperature: 0.4,
    max_tokens: 600
  };

  const data = await requestJson(url, payload);
  const content = data?.choices?.[0]?.message?.content?.trim();

  if (!enforceKyrgyz(content)) {
    const retryPayload = {
      ...payload,
      messages: [
        { role: 'system', content: `${systemPrompt}\nЖоопту кыргыз тилинде гана бер.` },
        ...messages
      ]
    };
    const retryData = await requestJson(url, retryPayload);
    return retryData?.choices?.[0]?.message?.content?.trim();
  }

  return content;
};

export const summarizeMemory = async ({ systemPrompt, transcript }) => {
  if (!config.llm.apiKey) {
    throw new Error('LLM_API_KEY is not configured');
  }

  const url = `${config.llm.baseUrl}/chat/completions`;
  const payload = {
    model: config.llm.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: transcript }
    ],
    temperature: 0.2,
    max_tokens: 300
  };

  const data = await requestJson(url, payload);
  return data?.choices?.[0]?.message?.content?.trim();
};
