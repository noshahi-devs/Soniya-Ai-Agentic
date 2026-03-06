const normalizeText = (value = '') => value.toLowerCase().trim();
const normalizeSender = (value = '') => normalizeText(value).replace(/[^a-z0-9\s]/g, '');

const YES_PATTERNS = ['haan', 'han', 'yes', 'read it', 'sunao', 'sunao'];
const NO_PATTERNS = ['no', 'nahi', 'ignore', 'skip'];
const SEND_PATTERNS = ['send', 'bhej do', 'message bhej do', 'confirm send'];

const hasAnyPhrase = (text, phrases) => phrases.some((phrase) => text.includes(phrase));
const matchesStandalonePhrase = (text, phrases) => phrases.some((phrase) => text === phrase);

export const QUICK_COMMANDS = [
  'Soniya open karo',
  'Kis kis ka message aya hai?',
  'Nabeel ka message open karo',
  'Reply bhejo',
  'Likho kal milte hain',
];

export const detectIntent = (inputText, messages = []) => {
  const originalText = String(inputText || '').trim();
  const normalized = normalizeText(originalText);

  if (!normalized) {
    return { type: 'EMPTY', rawText: originalText };
  }

  const pinMatch = normalized.match(/(?:pin\s*)?(\d{4,})/);
  if (pinMatch) {
    return { type: 'VERIFY_PIN', rawText: originalText, pin: pinMatch[1] };
  }

  if (normalized.includes('reply bhejo') || normalized.includes('reply karo') || normalized.includes('jawab bhejo')) {
    return { type: 'START_REPLY', rawText: originalText };
  }

  const writeMatch = originalText.match(/(?:likho|write)\s+(.+)/i);
  if (writeMatch?.[1]) {
    return { type: 'SET_REPLY_DRAFT', rawText: originalText, replyText: writeMatch[1].trim() };
  }

  if (hasAnyPhrase(normalized, SEND_PATTERNS)) {
    return { type: 'SEND_REPLY', rawText: originalText };
  }

  if (normalized.includes('lock session') || normalized.includes('privacy lock') || normalized === 'lock') {
    return { type: 'LOCK_PRIVACY', rawText: originalText };
  }

  if (normalized.includes('kis kis ka message aya hai') || normalized.includes('message list') || normalized.includes('kis ka message aya hai')) {
    return { type: 'LIST_SENDERS', rawText: originalText };
  }

  if (normalized.includes('soniya open karo') || normalized.includes('soniya app kholo') || normalized.includes('open soniya')) {
    return { type: 'OPEN_APP', rawText: originalText };
  }

  const senderOpenMatch = originalText.match(/(.+?)\s+ka\s+message\s+(?:open|khol|khol do|sunao|sunao|read|show)/i);
  if (senderOpenMatch?.[1]) {
    return {
      type: 'READ_MESSAGE_BY_SENDER',
      rawText: originalText,
      senderQuery: senderOpenMatch[1].trim(),
    };
  }

  const senderReplyMatch = originalText.match(/(.+?)\s+ko\s+reply/i);
  if (senderReplyMatch?.[1]) {
    return {
      type: 'START_REPLY',
      rawText: originalText,
      senderQuery: senderReplyMatch[1].trim(),
    };
  }

  if (normalized.includes('new message') || normalized.includes('latest message') || normalized.includes('message sunao') || normalized.includes('message read karo')) {
    return { type: 'READ_LATEST_MESSAGE', rawText: originalText };
  }

  if (matchesStandalonePhrase(normalized, YES_PATTERNS)) {
    return { type: 'CONFIRM_READ_LATEST', rawText: originalText };
  }

  if (matchesStandalonePhrase(normalized, NO_PATTERNS)) {
    return { type: 'IGNORE_MESSAGE', rawText: originalText };
  }

  const senderNames = messages.map((message) => message.sender);
  const matchedSender = senderNames.find((sender) => normalized.includes(normalizeSender(sender)));
  if (matchedSender && normalized.includes('message')) {
    return {
      type: 'READ_MESSAGE_BY_SENDER',
      rawText: originalText,
      senderQuery: matchedSender,
    };
  }

  return { type: 'UNKNOWN', rawText: originalText };
};
