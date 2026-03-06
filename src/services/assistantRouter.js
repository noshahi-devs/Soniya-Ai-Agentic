import { askSoniya } from '../../api/gemini';
import { processLocalMemoryCommand } from '../../api/localMemory';
import { detectIntent } from '../ai/intentEngine';
import { processAgentCommand } from './messageHandler';

const MESSAGE_INTENT_TYPES = new Set([
  'OPEN_APP',
  'LIST_SENDERS',
  'READ_LATEST_MESSAGE',
  'CONFIRM_READ_LATEST',
  'READ_MESSAGE_BY_SENDER',
  'VERIFY_PIN',
  'IGNORE_MESSAGE',
  'START_REPLY',
  'SET_REPLY_DRAFT',
  'SEND_REPLY',
  'LOCK_PRIVACY',
]);

const deriveActivityMode = (intentType = '', mood = '') => {
  if (intentType === 'LIST_SENDERS' || intentType === 'READ_MESSAGE_BY_SENDER' || intentType === 'READ_LATEST_MESSAGE') {
    return 'READING';
  }

  if (intentType === 'START_REPLY' || intentType === 'SET_REPLY_DRAFT' || intentType === 'SEND_REPLY') {
    return 'PHONE';
  }

  if (String(mood || '').toUpperCase() === 'SAD') {
    return 'RELAX';
  }

  return 'CHAT';
};

export const routeAssistantInput = async ({
  inputText,
  inbox,
  settings,
  privacyState,
  session,
}) => {
  const trimmedInput = String(inputText || '').trim();

  if (!trimmedInput) {
    return {
      type: 'EMPTY',
      responseText: '',
      inbox,
      settings,
      privacyState,
      session,
      mood: 'HAPPY',
      activityMode: 'CHAT',
    };
  }

  const memoryResult = await processLocalMemoryCommand(trimmedInput);
  if (memoryResult?.handled) {
    return {
      type: 'MEMORY',
      responseText: memoryResult.text || '',
      inbox,
      settings,
      privacyState,
      session,
      mood: memoryResult.mood || 'HAPPY',
      activityMode: deriveActivityMode('', memoryResult.mood),
    };
  }

  const detectedIntent = detectIntent(trimmedInput, inbox);
  if (MESSAGE_INTENT_TYPES.has(detectedIntent.type)) {
    const commandResult = processAgentCommand({
      commandText: trimmedInput,
      inbox,
      settings,
      privacyState,
      session,
    });

    return {
      type: 'COMMAND',
      ...commandResult,
      mood: 'HAPPY',
      activityMode: deriveActivityMode(detectedIntent.type),
    };
  }

  const aiResult = await askSoniya(trimmedInput);
  return {
    type: 'CHAT',
    responseText: aiResult?.text || 'Main abhi jawab nahi de pa rahi.',
    inbox,
    settings,
    privacyState,
    session,
    mood: aiResult?.mood || 'HAPPY',
    activityMode: deriveActivityMode('', aiResult?.mood),
  };
};
