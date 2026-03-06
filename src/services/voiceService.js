import { initSoniyaVoice, soniyaSpeak } from '../../api/voiceService';
import {
  ExpoSpeechRecognitionModule,
  isSpeechRecognitionAvailable,
  speechRecognitionInitError,
} from '../../utils/speechRecognitionSafe';

const sanitizeSpokenText = (text = '') => (
  String(text)
    .replace(/[`"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
);

const safeCall = async (fn, fallbackValue) => {
  try {
    return await fn();
  } catch (_error) {
    return fallbackValue;
  }
};

export const initializeVoicePersona = async () => {
  try {
    await initSoniyaVoice('soniya_default');
    return true;
  } catch (_error) {
    return false;
  }
};

export const getVoiceRuntimeSnapshot = async () => {
  const recognitionAvailable = isSpeechRecognitionAvailable();
  const permissions = await safeCall(
    () => ExpoSpeechRecognitionModule.getPermissionsAsync(),
    {
      granted: false,
      status: 'unavailable',
      canAskAgain: false,
    }
  );

  const defaultRecognitionService = safeCall(
    async () => ExpoSpeechRecognitionModule.getDefaultRecognitionService?.(),
    null
  );

  const assistantService = safeCall(
    async () => ExpoSpeechRecognitionModule.getAssistantService?.(),
    null
  );

  const [resolvedDefaultService, resolvedAssistantService] = await Promise.all([
    defaultRecognitionService,
    assistantService,
  ]);

  return {
    recognitionAvailable,
    permissionGranted: Boolean(permissions?.granted),
    permissionStatus: permissions?.status || 'unavailable',
    canAskAgain: Boolean(permissions?.canAskAgain),
    defaultRecognitionService: resolvedDefaultService?.packageName || '',
    assistantService: resolvedAssistantService?.packageName || '',
    initErrorMessage: speechRecognitionInitError?.message || '',
  };
};

export const speakAssistantResponse = (text, settings = {}, callbacks = {}) => {
  const sanitized = sanitizeSpokenText(text);
  if (!sanitized) {
    return false;
  }

  if (!settings.voiceNotifications || settings.presenceMode) {
    return false;
  }

  soniyaSpeak(sanitized, callbacks.onStart, callbacks.onEnd, {
    rate: 0.98,
  });

  return true;
};
