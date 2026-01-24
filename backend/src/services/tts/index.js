import config from '../../config.js';
import { synthesizeWithGoogle } from './google.js';

export const synthesizeSpeech = async ({ text }) => {
  switch (config.tts.provider) {
    case 'google':
      return synthesizeWithGoogle({ text });
    default:
      throw new Error(`Unsupported TTS_PROVIDER: ${config.tts.provider}`);
  }
};
