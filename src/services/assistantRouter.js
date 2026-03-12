import { askSoniya } from '../../api/gemini';
import { processLocalMemoryCommand } from '../../api/localMemory';
import { detectIntent } from '../ai/intentEngine';
import {
  buildCallFailedResponse,
  buildCallSuccessResponse,
  buildClickResponse,
  buildLaunchAppMissingResponse,
  buildLaunchAppSuccessResponse,
  buildLaunchAppUnavailableResponse,
  buildScrollResponse,
  buildSearchResponse,
  buildSystemAdjustResponse,
  buildSystemToggleResponse,
  buildTypeResponse,
} from '../ai/responseEngine';
import { normalizeCompanionReplyText } from './companionPersona.js';
import { processAgentCommand } from './messageHandler';
import {
  launchInstalledApp,
  performClickByText,
  performNativeCall,
  performNativeScroll,
  performSystemAdjust,
  performSystemToggle,
  performTypeText,
  performWebSearch,
} from './nativeAssistantService';

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
  if (intentType === 'OPEN_EXTERNAL_APP' || intentType === 'CALL_CONTACT' || intentType === 'WEB_SEARCH') {
    return 'PHONE';
  }

  if (intentType === 'SCROLL_COMMAND') {
    return 'READING';
  }

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
  const romanticTone = Boolean(settings?.romanticCompanionMode);

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
      responseText: normalizeCompanionReplyText(memoryResult.text || ''),
      inbox,
      settings,
      privacyState,
      session,
      mood: memoryResult.mood || 'HAPPY',
      activityMode: deriveActivityMode('', memoryResult.mood),
    };
  }

  const detectedIntent = detectIntent(trimmedInput, inbox);

  // PRIVACY: Handle Call locally
  if (detectedIntent.type === 'CALL_CONTACT') {
    const contactName = detectedIntent.contactName || 'number';
    const callResult = await performNativeCall(contactName);
    const responseText = callResult.ok
      ? buildCallSuccessResponse(contactName, romanticTone)
      : buildCallFailedResponse(contactName, romanticTone);

    return {
      type: 'PHONE_ACTION',
      responseText: normalizeCompanionReplyText(responseText),
      inbox,
      settings,
      privacyState,
      session,
      mood: callResult.ok ? 'HAPPY' : 'SAD',
      activityMode: 'PHONE',
    };
  }

  // PRIVACY: Handle Scroll locally
  if (detectedIntent.type === 'SCROLL_COMMAND') {
    const direction = detectedIntent.direction || 'DOWN';
    await performNativeScroll(direction);
    return {
      type: 'PHONE_ACTION',
      responseText: normalizeCompanionReplyText(buildScrollResponse(direction, romanticTone)),
      inbox,
      settings,
      privacyState,
      session,
      mood: 'HAPPY',
      activityMode: 'READING',
    };
  }

  // PRIVACY: Handle Web Search locally (don't share query with Gemini)
  if (detectedIntent.type === 'WEB_SEARCH') {
    const searchQuery = detectedIntent.searchQuery || '';
    await performWebSearch(searchQuery);
    return {
      type: 'PHONE_ACTION',
      responseText: normalizeCompanionReplyText(buildSearchResponse(searchQuery, romanticTone)),
      inbox,
      settings,
      privacyState,
      session,
      mood: 'HAPPY',
      activityMode: 'PHONE',
    };
  }

  // SYSTEM CONTROL: Volume/Brightness
  if (detectedIntent.type === 'SYSTEM_ADJUST') {
    const { target, action } = detectedIntent;
    await performSystemAdjust(target, action);
    return {
      type: 'SYSTEM_ACTION',
      responseText: normalizeCompanionReplyText(buildSystemAdjustResponse(target, action, romanticTone)),
      inbox,
      settings,
      privacyState,
      session,
      mood: 'HAPPY',
      activityMode: 'PHONE',
    };
  }

  // SYSTEM CONTROL: Wi-Fi/Bluetooth Toggles
  if (detectedIntent.type === 'SYSTEM_TOGGLE') {
    const { target, action } = detectedIntent;
    await performSystemToggle(target, action);
    return {
      type: 'SYSTEM_ACTION',
      responseText: normalizeCompanionReplyText(buildSystemToggleResponse(target, action, romanticTone)),
      inbox,
      settings,
      privacyState,
      session,
      mood: 'HAPPY',
      activityMode: 'PHONE',
    };
  }

  // ACCESSIBILITY: Click by Text
  if (detectedIntent.type === 'CLICK_ACTION') {
    const target = detectedIntent.target || '';
    const result = await performClickByText(target);
    return {
      type: 'NATIVE_ACTION',
      responseText: normalizeCompanionReplyText(buildClickResponse(target, result.ok, romanticTone)),
      inbox,
      settings,
      privacyState,
      session,
      mood: result.ok ? 'HAPPY' : 'SAD',
      activityMode: 'PHONE',
    };
  }

  // ACCESSIBILITY: Type Text
  if (detectedIntent.type === 'TYPE_ACTION') {
    const text = detectedIntent.text || '';
    const result = await performTypeText(text);
    return {
      type: 'NATIVE_ACTION',
      responseText: normalizeCompanionReplyText(buildTypeResponse(text, result.ok, romanticTone)),
      inbox,
      settings,
      privacyState,
      session,
      mood: result.ok ? 'HAPPY' : 'SAD',
      activityMode: 'PHONE',
    };
  }

  if (detectedIntent.type === 'OPEN_EXTERNAL_APP') {
    const appLabel = detectedIntent.appQuery || 'yeh app';
    const launchResult = await launchInstalledApp(appLabel);
    const resolvedLabel = launchResult.appName || detectedIntent.appQuery || 'yeh app';
    let responseText = '';
    let mood = 'HAPPY';

    if (launchResult.ok) {
      responseText = buildLaunchAppSuccessResponse(resolvedLabel, romanticTone);
    } else if (
      launchResult.reason === 'bridge_unavailable'
      || launchResult.reason === 'unsupported_platform'
    ) {
      responseText = buildLaunchAppUnavailableResponse(resolvedLabel, romanticTone);
      mood = 'SAD';
    } else {
      responseText = buildLaunchAppMissingResponse(resolvedLabel, romanticTone);
      mood = 'SAD';
    }

    return {
      type: 'APP_LAUNCH',
      responseText: normalizeCompanionReplyText(responseText),
      inbox,
      settings,
      privacyState,
      session,
      mood,
      activityMode: deriveActivityMode(detectedIntent.type, mood),
      launchResult,
    };
  }

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
      responseText: normalizeCompanionReplyText(commandResult.responseText || ''),
      mood: 'HAPPY',
      activityMode: deriveActivityMode(detectedIntent.type),
    };
  }

  const aiResult = await askSoniya(trimmedInput);
  return {
    type: 'CHAT',
    responseText: normalizeCompanionReplyText(aiResult?.text || 'Main abhi jawab nahi de pa rahi.'),
    inbox,
    settings,
    privacyState,
    session,
    mood: aiResult?.mood || 'HAPPY',
    activityMode: deriveActivityMode('', aiResult?.mood),
  };
};
