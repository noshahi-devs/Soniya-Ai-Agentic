import AsyncStorage from '@react-native-async-storage/async-storage';

const INBOX_STORAGE_KEY = '@soniya_agentic_ai_inbox_v1';

const DEFAULT_INBOX = [
  {
    id: 'msg-001',
    app: 'WhatsApp',
    sender: 'Nabeel',
    body: 'Ab kab mil sakte ho?',
    receivedAt: 'Today 08:15 AM',
  },
  {
    id: 'msg-002',
    app: 'WhatsApp',
    sender: 'Ahmad',
    body: 'Meeting 3 baje confirm kar dein.',
    receivedAt: 'Today 07:42 AM',
  },
  {
    id: 'msg-003',
    app: 'WhatsApp',
    sender: 'Ali',
    body: 'Kal office kab aana hai?',
    receivedAt: 'Yesterday 09:30 PM',
  },
];

const cloneInbox = (messages = DEFAULT_INBOX) => messages.map((message) => ({ ...message }));

export const loadLocalInbox = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(INBOX_STORAGE_KEY);
    if (!rawValue) {
      const seededInbox = cloneInbox();
      await AsyncStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(seededInbox));
      return seededInbox;
    }

    const parsedInbox = JSON.parse(rawValue);
    return Array.isArray(parsedInbox) ? cloneInbox(parsedInbox) : cloneInbox();
  } catch (_error) {
    return cloneInbox();
  }
};

export const buildAnnouncement = (message, romanticTone = true) => {
  if (!message) return 'No message detected yet.';
  if (!romanticTone) {
    return `Soniya: ${message.sender} ne message bheja hai. Kya aap message sunna chahte hain?`;
  }
  return `Soniya: ${message.sender} ne message bheja hai, jani. Kya aap message sunna chahte hain?`;
};

export const getSuggestedReplies = (message, romanticTone = true) => {
  if (!message?.body) {
    return romanticTone
      ? ['Kal milte hain, jani.', 'Main check karke pyar se batati hoon.', 'Theek hai, confirm karti hoon.']
      : ['Kal milte hain.', 'Main check karke batati hoon.', 'Theek hai, confirm karti hoon.'];
  }

  const normalizedText = message.body.toLowerCase();

  if (normalizedText.includes('mil')) {
    return romanticTone
      ? ['Kal milte hain, jani.', 'Weekend par milte hain.', 'Aaj thora busy hoon, kal pyar se plan karte hain.']
      : ['Kal milte hain.', 'Weekend par milte hain.', 'Aaj thora busy hoon, kal plan karte hain.'];
  }

  if (normalizedText.includes('meeting')) {
    return romanticTone
      ? ['Theek hai, meeting 3 baje confirm hai.', 'Main calendar check karke abhi batati hoon, jani.', 'Ji, 3 baje ka plan noted hai.']
      : ['Theek hai, meeting 3 baje confirm hai.', 'Main calendar check karke abhi batati hoon.', 'Ji, 3 baje ka plan noted hai.'];
  }

  return romanticTone
    ? ['Theek hai, jaan.', 'Main is par pyara sa jawab tayar karti hoon.', 'Noted, thori der mein confirm karti hoon.']
    : ['Theek hai.', 'Main is par jawab tayar karti hoon.', 'Noted, thori der mein confirm karti hoon.'];
};
