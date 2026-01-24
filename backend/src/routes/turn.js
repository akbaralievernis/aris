import express from 'express';
import multer from 'multer';
import config from '../config.js';
import { SYSTEM_PROMPT, SUMMARY_PROMPT } from '../prompt.js';
import { transcribeAudio } from '../services/stt/index.js';
import { synthesizeSpeech } from '../services/tts/index.js';
import { callLLM, summarizeMemory } from '../services/llm/index.js';
import {
  saveMessage,
  getRecentMessages,
  getSummary,
  upsertSummary,
  getMessageCount
} from '../memory.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const buildContextMessages = (recentMessages, summary) => {
  const messages = [];
  if (summary) {
    messages.push({ role: 'system', content: `Эс тутум (кыскача): ${summary}` });
  }
  messages.push(...recentMessages);
  return messages;
};

router.post('/', upload.single('audio'), async (req, res) => {
  try {
    const sessionId = req.body.sessionId || 'default';
    const userText = req.body.text;
    const audioFile = req.file;

    let transcript = userText?.trim();

    if (!transcript && audioFile) {
      transcript = await transcribeAudio({
        audioBuffer: audioFile.buffer,
        mimeType: audioFile.mimetype
      });
    }

    if (!transcript) {
      return res.status(400).json({ error: 'Empty transcript' });
    }

    saveMessage(sessionId, 'user', transcript);

    const summary = getSummary(sessionId);
    const recentMessages = getRecentMessages(sessionId, config.memory.maxTurnsContext);
    const messages = buildContextMessages(recentMessages, summary);

    const responseText = await callLLM({
      systemPrompt: SYSTEM_PROMPT,
      messages
    });

    saveMessage(sessionId, 'assistant', responseText);

    const messageCount = getMessageCount(sessionId);
    if (messageCount % config.memory.summaryInterval === 0) {
      const transcriptForSummary = getRecentMessages(sessionId, config.memory.maxTurnsContext)
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');
      const summaryText = await summarizeMemory({
        systemPrompt: SUMMARY_PROMPT,
        transcript: transcriptForSummary
      });
      if (summaryText) {
        upsertSummary(sessionId, summaryText);
      }
    }

    const audioBase64 = await synthesizeSpeech({ text: responseText });

    return res.json({
      sessionId,
      transcript,
      responseText,
      audioBase64
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
