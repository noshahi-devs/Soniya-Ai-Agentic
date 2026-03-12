const normalizeText = (value = '') => value.toLowerCase().trim();
const normalizeSender = (value = '') => normalizeText(value).replace(/[^a-z0-9\s]/g, '');
const cleanupAppQuery = (value = '') => (
  String(value || '')
    .replace(/\b(app|please|plz|zara)\b/gi, ' ')
    .replace(/[?.!,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const YES_PATTERNS = ['haan', 'han', 'yes', 'read it', 'sunao', 'sunao'];
const NO_PATTERNS = ['no', 'nahi', 'ignore', 'skip'];
const SEND_PATTERNS = ['send', 'bhej do', 'message bhej do', 'confirm send'];
const OPEN_APP_PATTERN = '(?:kholo|khol do|kholdo|kholna|open karo|open kar do|open kr do|open krdo|open|launch karo|launch kar do|launch kr do|launch|chalao|chala do|chala do na|start karo|start kar do|start kr do|start krdo|run karo|run kar do|run kr do|run krdo)';
const CALL_PATTERN = '(?:call karo|call kar do|call kr do|call krdo|phone karo|dial karo|line milao|call|phone|dial)';
const SCROLL_PATTERN = '(?:scroll karo|scroll kar do|scroll kr do|scroll krdo|niche jao|upar jao|scroll)';
const SEARCH_PATTERN = '(?:search karo|search kar do|search|pata karo|search kr do|search krdo|find)';

const hasAnyPhrase = (text, phrases) => phrases.some((phrase) => text.includes(phrase));
const matchesStandalonePhrase = (text, phrases) => phrases.some((phrase) => text === phrase);

export const QUICK_COMMANDS = [
  'Soniya open karo',
  'WhatsApp kholo',
  'Volume barhao',
  'Wi-Fi band karo',
  'Brightness kam karo',
  'Adeel bai ko call karo',
  'Scroll karo',
  'Search Google for Pakistan',
  'Kis kis ka message aya hai?',
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

  // SYSTEM ADJUST (Volume, Brightness)
  const adjustMatch = normalized.match(/(volume|brightness|awaz|roshni)\s+(.+)/i)
    || normalized.match(/(.+?)\s+(volume|brightness|awaz|roshni)/i);
  if (adjustMatch) {
    const target = (adjustMatch[1] || adjustMatch[2]).toLowerCase();
    const action = normalized.includes('barhao') || normalized.includes('zyada') || normalized.includes('increase') || normalized.includes('up') ? 'INCREASE' : 'DECREASE';
    const resolvedTarget = (target === 'awaz' || target === 'volume') ? 'VOLUME' : 'BRIGHTNESS';
    return { type: 'SYSTEM_ADJUST', rawText: originalText, target: resolvedTarget, action };
  }

  // SYSTEM TOGGLE (Wi-Fi, Bluetooth, Airplane, Torch)
  const toggleMatch = normalized.match(/(wifi|bluetooth|torch|flashlight|airplane mode|data|internet)\s+(.+)/i)
    || normalized.match(/(.+?)\s+(wifi|bluetooth|torch|flashlight|airplane mode|data|internet)/i);
  if (toggleMatch) {
    const target = (toggleMatch[1] || toggleMatch[2]).toLowerCase();
    const action = normalized.includes('on') || normalized.includes('chala') || normalized.includes('enable') || normalized.includes('kholo') ? 'ON' : 'OFF';

    // Normalize targets
    let resolvedTarget = target.toUpperCase().replace(/\s+/g, '_');
    if (resolvedTarget === 'DATA' || resolvedTarget === 'INTERNET') resolvedTarget = 'MOBILE_DATA';
    if (resolvedTarget === 'FLASHLIGHT') resolvedTarget = 'TORCH';

    return { type: 'SYSTEM_TOGGLE', rawText: originalText, target: resolvedTarget, action };
  }

  // CLICK Detection
  const clickMatch = normalized.match(/(?:like karo|like kardo|like ka button dabao|like)/i)
    || originalText.match(/(?:click|press|dabayen|dabao)\s+(?:on\s+)?(.+)/i);
  if (clickMatch) {
    const target = clickMatch[1] ? clickMatch[1].trim() : 'Like';
    return { type: 'CLICK_ACTION', rawText: originalText, target };
  }

  // TYPE Detection
  const typeMatch = originalText.match(/(?:type|likho|likh do)\s+(.+)/i);
  if (typeMatch && !normalized.includes('message')) { // Avoid confusion with message draft
    return { type: 'TYPE_ACTION', rawText: originalText, text: typeMatch[1].trim() };
  }

  // CALL Detection - Needs high priority for privacy
  const callMatch = originalText.match(new RegExp(`(.+?)\\s+(?:ko\\s+)?${CALL_PATTERN}\\s*$`, 'i'))
    || originalText.match(new RegExp(`^${CALL_PATTERN}\\s+(?:to\\s+)?(.+?)\\s*$`, 'i'));
  if (callMatch?.[1]) {
    const contactName = callMatch[1].replace(/\b(ko|to|zara|please|plz)\b/gi, ' ').trim();
    if (contactName && !/\bmessage\b/i.test(contactName)) {
      return { type: 'CALL_CONTACT', rawText: originalText, contactName };
    }
  }

  // SCROLL Detection
  if (new RegExp(SCROLL_PATTERN, 'i').test(normalized)) {
    const direction = normalized.includes('upar') || normalized.includes('up') ? 'UP' : 'DOWN';
    return { type: 'SCROLL_COMMAND', rawText: originalText, direction };
  }

  // SEARCH Detection
  const searchMatch = originalText.match(new RegExp(`${SEARCH_PATTERN}\\s+(?:for\\s+)?(.+?)\\s*$`, 'i'))
    || originalText.match(new RegExp(`(.+?)\\s+(?:ko\\s+)?${SEARCH_PATTERN}\\s*$`, 'i'));
  if (searchMatch?.[1]) {
    const searchQuery = searchMatch[1].replace(/\b(for|zara|please|plz|ko)\b/gi, ' ').trim();
    if (searchQuery && !/\b(message|call|app|open)\b/i.test(searchQuery)) {
      return { type: 'WEB_SEARCH', rawText: originalText, searchQuery };
    }
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

  const trailingOpenMatch = originalText.match(new RegExp(`(.+?)\\s+(?:app\\s+)?${OPEN_APP_PATTERN}\\s*$`, 'i'));
  if (trailingOpenMatch?.[1]) {
    const appQuery = cleanupAppQuery(trailingOpenMatch[1]);
    if (appQuery && !/\bmessage\b/i.test(appQuery)) {
      return {
        type: 'OPEN_EXTERNAL_APP',
        rawText: originalText,
        appQuery,
      };
    }
  }

  const leadingOpenMatch = originalText.match(/^(?:open|launch)\s+(.+?)\s*$/i);
  if (leadingOpenMatch?.[1]) {
    const appQuery = cleanupAppQuery(leadingOpenMatch[1]);
    if (appQuery && !/\bmessage\b/i.test(appQuery)) {
      return {
        type: 'OPEN_EXTERNAL_APP',
        rawText: originalText,
        appQuery,
      };
    }
  }

  return { type: 'UNKNOWN', rawText: originalText };
};
