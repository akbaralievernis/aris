import config from '../../config.js';
import { transcribeWithGoogle } from './google.js';

export const transcribeAudio = async ({ audioBuffer, mimeType }) => {
  switch (config.stt.provider) {
    case 'google':
      return transcribeWithGoogle({ audioBuffer, mimeType });
    default:
      throw new Error(`Unsupported STT_PROVIDER: ${config.stt.provider}`);
  }
};
