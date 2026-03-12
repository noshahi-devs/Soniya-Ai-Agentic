import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_OWNER_PIN } from '../src/constants/appConfig.js';

const STORAGE_KEY = '@soniya_local_memory_v1';

const DEFAULT_MEMORY = {
  profile: {
    userName: ['Nabeel Khalil', 'Nabeel Jaani', 'Nabeel Sb' ],
    fatherNames: ['Muhammad Khalil Noshahi sab', 'Baba Khalil Noshahi Sb'],
    brothers: [
      'Adeel Noshahi sab',
      'Aqeel Noshahi Sb',
      'Nabeel Khalil',
      'Sharjeel Noshahi'
    ]
  },
  creatorStory: {
    ur: 'Beshak har cheez ka khalik Allah Pak hai. Mujhe Nabeel Noshahi Sb ne develop kiya, jo Noshahi Developers Inc. ke App Developer aur Business Developer hain; mujhe NDI ke CEO Janab Adeel Noshahi Sb ki guidance aur approval ke sath tayyar kiya gaya, aur isme NDI team ki mehnat bhi shamil hai.',
    en: 'Above all, everything is created by Allah Almighty. I was developed by Mr. Nabeel Noshahi, the App Developer and Business Developer at Noshahi Developers Inc.; I was built with the guidance and approval of NDI CEO Mr. Adeel Noshahi, with valuable contributions from the NDI team.',
    pa: 'Beshak har cheez da khalik Allah Pak ae. Mainu Nabeel Noshahi Sb ne develop kita, jo Noshahi Developers Inc. vich App Developer te Business Developer ne; main NDI de CEO Janab Adeel Noshahi Sb di guidance te approval naal bani aan, te NDI team di mehnat vi is vich shamil ae.'
  },
  security: {
    ownerPin: DEMO_OWNER_PIN,
    unlockUntil: 0,
    pendingPrivateKey: ''
  },
  privateFacts: {
    motherName: '',
    sisterName: ''
  },
  companionSetup: {
    pendingFactKey: '',
    introShown: false,
  },
  customFacts: {},
  notes: []
};

const cloneDefaultMemory = () => JSON.parse(JSON.stringify(DEFAULT_MEMORY));

const normalize = (value = '') => value.toLowerCase().trim();

const cleanValue = (value = '') =>
  value
    .replace(/^[\s:=-]+/, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[\s.]+$/, '')
    .replace(/\b(hai|is|hoon|hun|hu|ho|hain|am)\b\s*$/i, '')
    .trim();

const mergeMemory = (stored = {}) => ({
  ...cloneDefaultMemory(),
  ...stored,
  profile: { ...cloneDefaultMemory().profile, ...(stored?.profile || {}) },
  creatorStory: { ...cloneDefaultMemory().creatorStory, ...(stored?.creatorStory || {}) },
  security: { ...cloneDefaultMemory().security, ...(stored?.security || {}) },
  privateFacts: { ...cloneDefaultMemory().privateFacts, ...(stored?.privateFacts || {}) },
  companionSetup: { ...cloneDefaultMemory().companionSetup, ...(stored?.companionSetup || {}) },
  customFacts: { ...(stored?.customFacts || {}) },
  notes: Array.isArray(stored?.notes) ? stored.notes : []
});

export const loadLocalMemory = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = cloneDefaultMemory();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return mergeMemory(JSON.parse(raw));
  } catch (_err) {
    return cloneDefaultMemory();
  }
};

export const saveLocalMemory = async (memory) => {
  const next = mergeMemory(memory);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const syncLocalMemorySecurityPin = async (nextPin = '') => {
  const normalizedPin = String(nextPin || '').replace(/\D/g, '');
  if (!normalizedPin) {
    return { ok: false };
  }

  const memory = await loadLocalMemory();
  memory.security.ownerPin = normalizedPin;
  memory.security.unlockUntil = 0;
  memory.security.pendingPrivateKey = '';
  await saveLocalMemory(memory);
  return { ok: true };
};

export const lockLocalMemorySecuritySession = async () => {
  const memory = await loadLocalMemory();
  memory.security.unlockUntil = 0;
  memory.security.pendingPrivateKey = '';
  await saveLocalMemory(memory);
  return { ok: true };
};

export const getCompanionProfilePrompt = async () => {
  const memory = await loadLocalMemory();
  const nextFactKey = getNextCompanionFactKey(memory);
  if (!nextFactKey) {
    if (memory.companionSetup?.pendingFactKey) {
      setCompanionPendingFactKey(memory, '');
      await saveLocalMemory(memory);
    }
    return '';
  }

  setCompanionPendingFactKey(memory, nextFactKey);
  await saveLocalMemory(memory);
  return buildCompanionProfileQuestion(memory, nextFactKey, 'ur');
};

const extractAfterMarkers = (text, markers) => {
  const lower = normalize(text);
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx >= 0) {
      const raw = text.slice(idx + marker.length);
      const value = cleanValue(raw);
      if (value) return value;
    }
  }
  return '';
};

const hasNabeelValidation = (text = '') => {
  return /\b(main|mai|mein|ma|me)\s+nabeel\b/i.test(text)
    || /\b(i am|i'm|this is)\s+nabeel\b/i.test(text);
};

const askMomName = (text = '') => /(\bammi\b|\bmom\b|\bmother\b).*(\bname\b|\bnaam\b)|(\bname\b|\bnaam\b).*(\bammi\b|\bmom\b|\bmother\b)/i.test(text);
const askSisName = (text = '') => /(\bsis\b|\bsister\b|\bbehan\b).*(\bname\b|\bnaam\b)|(\bname\b|\bnaam\b).*(\bsis\b|\bsister\b|\bbehan\b)/i.test(text);
const askBrothers = (text = '') => /(\bbhai\b|\bbrother\b|\bbrothers\b).*(\bname\b|\bnaam\b)|(\bname\b|\bnaam\b).*(\bbhai\b|\bbrother\b|\bbrothers\b)/i.test(text);
const askFather = (text = '') => /(\babu\b|\babba\b|\bfather\b).*(\bname\b|\bnaam\b)|(\bname\b|\bnaam\b).*(\babu\b|\babba\b|\bfather\b)/i.test(text);
const askRemembered = (text = '') => /kya yaad|kya yaad hai|what do you remember|what did i ask you to remember|yaad rakhne ko/i.test(text);
const askWhoCreated = (text = '') =>
  /kis ne.*(banaya|bnaya)|aapko.*(banaya|bnaya)|who (made|created|built) you|who is your creator|tusi.*(kis ne|kinne).*(banaya|bnaya)|tuhanu.*(kis ne|kinne).*(banaya|bnaya)/i.test(text);
const askForPinContext = (text = '') =>
  /\b(pin|passcode|password|verify|verification|code|access)\b/i.test(text);

const isRememberCommand = (text = '') => /yaad rakhna|remember this|save this|is baat ko yaad/i.test(text);

const extractRememberNote = (text = '') => {
  const lower = normalize(text);
  const markers = ['yaad rakhna', 'remember this', 'save this', 'is baat ko yaad'];
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx >= 0) {
      const note = cleanValue(text.slice(idx + marker.length));
      return note || '';
    }
  }
  return '';
};

const extractGenericFact = (text = '') => {
  const match = text.match(/(.+?)\s+ka\s+name\s+(.+?)\s+hai/i);
  if (!match) return null;

  const rawLabel = cleanValue(match[1]);
  const rawValue = cleanValue(match[2]);
  if (!rawLabel || !rawValue) return null;

  const lowerLabel = normalize(rawLabel);
  if (/(ammi|mom|mother|sis|sister|behan)/i.test(lowerLabel)) return null;

  return { key: lowerLabel, label: rawLabel, value: rawValue };
};

const askGenericName = (text = '') => {
  const match = text.match(/(.+?)\s+ka\s+name\s+(kya hai|kya|btao|batao|btaein|btain)/i);
  if (!match) return '';
  return normalize(cleanValue(match[1]));
};

const normalizeFactKey = (value = '') =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const looksLikeQuestionValue = (value = '') =>
  /\b(kya|kia|what|who|where|kab|kahan|kaha|kaun|kon|kis|kyun|kyu|why|when|which|how)\b/i.test(value);

const SENSITIVE_MEMORY_PATTERN = /\b(pin|password|passcode|otp|cvv|cvc|atm|bank|account|secret)\b/i;

const FACT_LABELS = {
  user_name: { ur: 'aap ka naam', en: 'your name', pa: 'tuhada naam' },
  birthday: { ur: 'aap ka birthday', en: 'your birthday', pa: 'tuhada birthday' },
  age: { ur: 'aap ki age', en: 'your age', pa: 'tuhadi age' },
  city: { ur: 'aap ka shehar', en: 'your city', pa: 'tuhada shehar' },
  profession: { ur: 'aap ka kaam', en: 'your work', pa: 'tuhada kam' },
  likes: { ur: 'aap ki pasand', en: 'what you like', pa: 'tuhadi pasand' },
};

const COMPANION_PROFILE_FLOW = [
  {
    key: 'user_name',
    category: 'identity',
    label: 'aap ka naam',
    questions: {
      ur: "Main aap ko better jaan'na chahti hoon taa ke main aap ki important baatein yaad rakh sakoon. Sab se pehle aap ka naam kya hai?",
      en: 'I want to know you better so I can remember your important details. First, what is your name?',
      pa: "Main tuhanu changi tarah jaan'na chauni aan taa ke tuhadiyan aham gallan yaad rakh sakan. Sab ton pehlan tuhadda naam ki ae?",
    },
    retry: {
      ur: 'Bas apna naam bata dein, jaise Nabeel Khalil.',
      en: 'Just tell me your name, for example Nabeel Khalil.',
      pa: 'Bas apna naam dass deo, misal layi Nabeel Khalil.',
    },
  },
  {
    key: 'age',
    category: 'identity',
    label: 'aap ki age',
    questions: {
      ur: 'Ab mujhe aap ki age bata dein. Sirf number bhi chalega, jaise 25.',
      en: 'Now tell me your age. A number only is fine, like 25.',
      pa: 'Hun mainu tuhadi age dass deo. Sirf number vi theek ae, jivein 25.',
    },
    retry: {
      ur: 'Age number mein bata dein, jaise 25.',
      en: 'Tell me the age in numbers, like 25.',
      pa: 'Age number vich dass deo, jivein 25.',
    },
  },
  {
    key: 'city',
    category: 'identity',
    label: 'aap ka shehar',
    questions: {
      ur: 'Aur aap kis shehar se hain?',
      en: 'And which city are you from?',
      pa: 'Te tusi kis shehar ton ho?',
    },
    retry: {
      ur: 'Apna shehar bata dein, jaise Lahore.',
      en: 'Tell me your city, for example Lahore.',
      pa: 'Apna shehar dass deo, jivein Lahore.',
    },
  },
  {
    key: 'likes',
    category: 'preferences',
    label: 'aap ki pasand',
    mode: 'list',
    questions: {
      ur: 'Achha, aap ko kya pasand hai? Khana, hobby, ya koi bhi ek cheez bata dein.',
      en: 'What do you like? You can tell me a food, hobby, or anything you enjoy.',
      pa: 'Tuhanu ki pasand ae? Khaana, hobby, ya koi vi ik cheez dass deo.',
    },
    retry: {
      ur: 'Jo cheez aap ko pasand hai woh bata dein, jaise biryani.',
      en: 'Tell me something you like, for example biryani.',
      pa: 'Koi cheez dass deo jo tuhanu pasand ae, jivein biryani.',
    },
  },
  {
    key: 'favorite_color',
    category: 'favorite',
    label: 'favorite color',
    questions: {
      ur: 'Aur aap ka favorite color kya hai?',
      en: 'And what is your favorite color?',
      pa: 'Te tuhadda favorite color kehda ae?',
    },
    retry: {
      ur: 'Favorite color bata dein, jaise blue.',
      en: 'Tell me your favorite color, for example blue.',
      pa: 'Favorite color dass deo, jivein blue.',
    },
  },
];

const mergeAssistantReplies = (...parts) =>
  parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');

const getCompanionStepConfig = (factKey = '') =>
  COMPANION_PROFILE_FLOW.find((step) => step.key === factKey) || null;

const isFactMissing = (memory, factKey = '') => {
  const fact = getStoredFact(memory, factKey);
  return !formatFactValue(fact?.value);
};

const getNextCompanionFactKey = (memory) => {
  const pendingKey = memory.companionSetup?.pendingFactKey || '';
  if (pendingKey && isFactMissing(memory, pendingKey)) {
    return pendingKey;
  }

  const nextStep = COMPANION_PROFILE_FLOW.find((step) => isFactMissing(memory, step.key));
  return nextStep?.key || '';
};

const setCompanionPendingFactKey = (memory, factKey = '') => {
  memory.companionSetup.pendingFactKey = factKey;
  if (factKey) {
    memory.companionSetup.introShown = true;
  }
};

const buildCompanionProfileQuestion = (memory, factKey = '', lang = 'ur') => {
  const step = getCompanionStepConfig(factKey);
  if (!step) {
    return '';
  }

  const nameValue = formatFactValue(getStoredFact(memory, 'user_name')?.value);
  const prefix = factKey !== 'user_name' && nameValue
    ? (lang === 'en' ? `${nameValue}, ` : `${nameValue}, `)
    : '';

  return `${prefix}${step.questions?.[lang] || step.questions?.ur || ''}`.trim();
};

const buildCompanionRetryPrompt = (factKey = '', text = '') => {
  const step = getCompanionStepConfig(factKey);
  if (!step) {
    return '';
  }

  const lang = detectLanguageStyle(text);
  return step.retry?.[lang] || step.retry?.ur || '';
};

const buildCompanionProfileCompleteReply = (text = '') => {
  const lang = detectLanguageStyle(text);
  if (lang === 'en') {
    return 'Perfect, I have your basic profile saved in local memory now.';
  }
  if (lang === 'pa') {
    return 'Perfect, hun main tuhadi basic profile local memory vich yaad rakh lai ae.';
  }
  return 'Perfect, maine aap ki basic profile ab local memory mein yaad rakh li hai.';
};

const isLikelyQuestionOrCommand = (text = '') =>
  /[?؟]|\b(kya|kia|what|who|where|when|why|how|kab|kahan|kaun|kon|kis|message|reply|pin|lock|open|kholo|sunao|batao|creator|banaya)\b/i.test(text);

const parsePendingCompanionAnswer = (pendingKey = '', text = '') => {
  const value = cleanValue(text);
  if (!pendingKey || !value || isLikelyQuestionOrCommand(text)) {
    return null;
  }

  if (pendingKey === 'age') {
    const ageMatch = String(text).match(/\b(\d{1,3})\b/);
    if (!ageMatch) {
      return { invalid: true };
    }
    const ageNumber = Number(ageMatch[1]);
    if (ageNumber < 1 || ageNumber > 120) {
      return { invalid: true };
    }
    return {
      key: 'age',
      label: 'aap ki age',
      value: String(ageNumber),
      category: 'identity',
    };
  }

  if (pendingKey === 'user_name') {
    if (!/[a-z]/i.test(value) || /\d/.test(value) || value.length < 2) {
      return { invalid: true };
    }
    return {
      key: 'user_name',
      label: 'aap ka naam',
      value,
      category: 'identity',
    };
  }

  if (pendingKey === 'city') {
    if (!/[a-z]/i.test(value) || /\d/.test(value) || value.length < 2) {
      return { invalid: true };
    }
    return {
      key: 'city',
      label: 'aap ka shehar',
      value,
      category: 'identity',
    };
  }

  if (pendingKey === 'likes') {
    if (value.length < 2) {
      return { invalid: true };
    }
    return {
      key: 'likes',
      label: 'aap ki pasand',
      value,
      category: 'preferences',
      mode: 'list',
    };
  }

  if (pendingKey === 'favorite_color') {
    if (!/[a-z]/i.test(value) || value.length < 2) {
      return { invalid: true };
    }
    return {
      key: 'favorite_color',
      label: 'favorite color',
      value,
      category: 'favorite',
    };
  }

  return null;
};

const getCompanionFollowUpPrompt = (memory, text = '', savedFactKeys = []) => {
  const lang = detectLanguageStyle(text);
  const currentPendingKey = memory.companionSetup?.pendingFactKey || '';
  const savedRelevantFact = savedFactKeys.some((key) => COMPANION_PROFILE_FLOW.some((step) => step.key === key));
  if (!currentPendingKey && !savedRelevantFact) {
    return '';
  }

  const nextFactKey = getNextCompanionFactKey(memory);
  if (!nextFactKey) {
    setCompanionPendingFactKey(memory, '');
    return buildCompanionProfileCompleteReply(text);
  }

  setCompanionPendingFactKey(memory, nextFactKey);
  return buildCompanionProfileQuestion(memory, nextFactKey, lang);
};

const extractByPatterns = (text = '', patterns = []) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const rawValue = cleanValue(match?.[1] || '');
    if (!rawValue || looksLikeQuestionValue(rawValue)) {
      continue;
    }
    return rawValue;
  }
  return '';
};

const rememberCustomFact = (memory, fact) => {
  if (!fact?.key || !fact?.value) {
    return;
  }

  const existing = memory.customFacts?.[fact.key] || {};
  memory.customFacts[fact.key] = {
    ...existing,
    label: fact.label || existing.label || fact.key,
    value: fact.value,
    category: fact.category || existing.category || 'general',
    updatedAt: Date.now(),
  };

  if (fact.key === 'user_name') {
    const currentNames = Array.isArray(memory.profile?.userName) ? memory.profile.userName : [];
    memory.profile.userName = [...new Set([String(fact.value).trim(), ...currentNames].filter(Boolean))];
  }
};

const rememberListFact = (memory, fact) => {
  if (!fact?.key || !fact?.value) {
    return;
  }

  const existing = memory.customFacts?.[fact.key] || {};
  const currentValues = Array.isArray(existing.value)
    ? existing.value
    : (existing.value ? [existing.value] : []);
  const nextValues = [...new Set([...currentValues, fact.value].map(cleanValue).filter(Boolean))];

  memory.customFacts[fact.key] = {
    ...existing,
    label: fact.label || existing.label || fact.key,
    value: nextValues,
    category: fact.category || existing.category || 'general',
    updatedAt: Date.now(),
  };
};

const getFactLabelForReply = (factKey = '', lang = 'ur', fallbackLabel = '') => {
  if (factKey.startsWith('favorite_')) {
    const category = factKey.replace(/^favorite_/, '').replace(/_/g, ' ');
    if (lang === 'en') return `your favorite ${category}`;
    if (lang === 'pa') return `tuhada favorite ${category}`;
    return `aap ka favorite ${category}`;
  }

  return FACT_LABELS[factKey]?.[lang] || fallbackLabel || factKey.replace(/_/g, ' ');
};

const getStoredFact = (memory, factKey = '') => {
  const stored = memory.customFacts?.[factKey];
  if (!stored) {
    return null;
  }

  return {
    key: factKey,
    label: stored.label || factKey.replace(/_/g, ' '),
    value: stored.value,
    category: stored.category || 'general',
    updatedAt: stored.updatedAt || 0,
  };
};

const formatFactValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(cleanValue).filter(Boolean).join(', ');
  }
  return cleanValue(String(value || ''));
};

const buildFactSaveReply = (text = '', facts = []) => {
  const lang = detectLanguageStyle(text);
  const labels = [...new Set(
    facts
      .map((fact) => getFactLabelForReply(fact.key, lang, fact.label))
      .filter(Boolean)
  )];

  if (lang === 'en') {
    if (labels.length === 1) {
      return `Okay, I have saved ${labels[0]} in local memory.`;
    }
    return `Okay, I have saved these personal details in local memory: ${labels.join(', ')}.`;
  }

  if (lang === 'pa') {
    if (labels.length === 1) {
      return `Theek ae, main ${labels[0]} local memory vich yaad rakh lita ae.`;
    }
    return `Theek ae, main eh personal details local memory vich yaad rakh litiyaan ne: ${labels.join(', ')}.`;
  }

  if (labels.length === 1) {
    return `Theek hai, maine ${labels[0]} local memory mein yaad rakh liya hai.`;
  }
  return `Theek hai, maine ye personal details local memory mein yaad rakh li hain: ${labels.join(', ')}.`;
};

const buildFactMissingReply = (text = '', factKey = '', fallbackLabel = '') => {
  const lang = detectLanguageStyle(text);
  const label = getFactLabelForReply(factKey, lang, fallbackLabel);

  if (lang === 'en') {
    return `You have not told me ${label} yet.`;
  }

  if (lang === 'pa') {
    return `Tusi menu ${label} haje tak nahi dasya.`;
  }

  return `Aap ne ${label} abhi tak mujhe nahi bataya.`;
};

const buildFactRecallReply = (text = '', factEntry = null) => {
  if (!factEntry) {
    return '';
  }

  const lang = detectLanguageStyle(text);
  const value = formatFactValue(factEntry.value);
  if (!value) {
    return '';
  }

  if (factEntry.key === 'city') {
    if (lang === 'en') return `You are from ${value}.`;
    if (lang === 'pa') return `Tusi ${value} ton ho.`;
    return `Aap ${value} se hain.`;
  }

  if (factEntry.key === 'likes') {
    if (lang === 'en') return `You like ${value}.`;
    if (lang === 'pa') return `Tuhanu ${value} pasand ae.`;
    return `Aap ko ${value} pasand hai.`;
  }

  const label = getFactLabelForReply(factEntry.key, lang, factEntry.label);
  if (lang === 'en') {
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} is ${value}.`;
  }
  if (lang === 'pa') {
    return `${label} ${value} ae.`;
  }
  return `${label} ${value} hai.`;
};

const buildFactSummarySentence = (lang = 'ur', factEntry = null) => {
  if (!factEntry) {
    return '';
  }
  const value = formatFactValue(factEntry.value);
  if (!value) {
    return '';
  }

  if (factEntry.key === 'city') {
    if (lang === 'en') return `you are from ${value}`;
    if (lang === 'pa') return `tusi ${value} ton ho`;
    return `aap ${value} se hain`;
  }

  if (factEntry.key === 'likes') {
    if (lang === 'en') return `you like ${value}`;
    if (lang === 'pa') return `tuhanu ${value} pasand ae`;
    return `aap ko ${value} pasand hai`;
  }

  const label = getFactLabelForReply(factEntry.key, lang, factEntry.label);
  if (lang === 'en') {
    return `${label} is ${value}`;
  }
  if (lang === 'pa') {
    return `${label} ${value} ae`;
  }
  return `${label} ${value} hai`;
};

const buildRememberedSummaryReply = (text = '', memory) => {
  const lang = detectLanguageStyle(text);
  const summaryKeys = ['user_name', 'city', 'profession', 'age', 'birthday', 'likes'];
  const summaryParts = summaryKeys
    .map((key) => getStoredFact(memory, key))
    .filter(Boolean)
    .map((factEntry) => buildFactSummarySentence(lang, factEntry))
    .filter(Boolean);

  const favoriteFacts = Object.entries(memory.customFacts || {})
    .filter(([key]) => key.startsWith('favorite_'))
    .sort((a, b) => (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0))
    .slice(0, 2)
    .map(([key, value]) => buildFactSummarySentence(lang, {
      key,
      label: value?.label || key.replace(/_/g, ' '),
      value: value?.value,
      category: value?.category || 'favorite',
    }))
    .filter(Boolean);

  const rememberedNotes = (memory.notes || [])
    .slice(0, 2)
    .map((item) => cleanValue(item?.text || ''))
    .filter(Boolean);

  const factText = [...summaryParts, ...favoriteFacts].slice(0, 5).join(', ');
  const noteText = rememberedNotes.join(', ');

  if (!factText && !noteText) {
    if (lang === 'en') return 'I do not have any saved personal details about you yet.';
    if (lang === 'pa') return 'Mere kol haje tak tuhade bare koi saved personal detail nahi hai.';
    return 'Abhi mere paas aap ke bare mein koi saved personal detail nahi hai.';
  }

  if (lang === 'en') {
    if (factText && noteText) {
      return `I remember this about you: ${factText}. You also asked me to remember: ${noteText}.`;
    }
    if (factText) {
      return `I remember this about you: ${factText}.`;
    }
    return `You asked me to remember: ${noteText}.`;
  }

  if (lang === 'pa') {
    if (factText && noteText) {
      return `Mainu tuhade bare eh yaad ae: ${factText}. Tusi menu eh gallan vi yaad rakhhan nu keha si: ${noteText}.`;
    }
    if (factText) {
      return `Mainu tuhade bare eh yaad ae: ${factText}.`;
    }
    return `Tusi menu eh gallan yaad rakhhan nu keha si: ${noteText}.`;
  }

  if (factText && noteText) {
    return `Mujhe aap ke bare mein ye yaad hai: ${factText}. Aur aap ne mujhe ye baatein yaad rakhne ko kahi thi: ${noteText}.`;
  }
  if (factText) {
    return `Mujhe aap ke bare mein ye yaad hai: ${factText}.`;
  }
  return `Aap ne mujhe ye baatein yaad rakhne ko kahi thi: ${noteText}.`;
};

const extractFavoriteFact = (text = '') => {
  const englishMatch = text.match(/\bmy\s+(?:favorite|favourite)\s+([a-z][a-z\s]{1,24}?)\s+is\s+(.+)$/i);
  const romanMatch = text.match(/\b(?:mera|meri)\s+(?:favorite|favourite|pasandeeda)\s+([a-z][a-z\s]{1,24}?)\s+(.+?)\s+hai$/i);
  const match = englishMatch || romanMatch;
  if (!match) {
    return null;
  }

  const category = cleanValue(match[1]);
  const value = cleanValue(match[2]);
  if (!category || !value || looksLikeQuestionValue(category) || looksLikeQuestionValue(value)) {
    return null;
  }

  return {
    key: `favorite_${normalizeFactKey(category)}`,
    label: `favorite ${category}`,
    value,
    category: 'favorite',
  };
};

const extractStructuredPersonalFacts = (text = '') => {
  if (SENSITIVE_MEMORY_PATTERN.test(text)) {
    return [];
  }

  const facts = [];
  const addFact = (fact) => {
    if (!fact?.key || !fact?.value) {
      return;
    }
    const exists = facts.some((item) => item.key === fact.key && formatFactValue(item.value) === formatFactValue(fact.value));
    if (!exists) {
      facts.push(fact);
    }
  };

  const userName = extractByPatterns(text, [
    /\b(?:mera|my)\s+(?:naam|name)\s+(?:is\s+)?(.+?)(?:\s+(?:aur|and)\b|[.!?]|$)/i,
  ]);
  if (userName) {
    addFact({ key: 'user_name', label: 'aap ka naam', value: userName, category: 'identity' });
  }

  const birthday = extractByPatterns(text, [
    /\b(?:meri|my)\s+(?:birthday|birth day|date of birth|dob)\s+(?:is\s+)?(.+?)(?:\s+(?:aur|and)\b|[.!?]|$)/i,
    /\b(?:mera|my)\s+janamdin\s+(.+?)(?:\s+(?:aur|and)\b|[.!?]|$)/i,
  ]);
  if (birthday) {
    addFact({ key: 'birthday', label: 'aap ka birthday', value: birthday, category: 'identity' });
  }

  const age = extractByPatterns(text, [
    /\b(?:meri|my)\s+(?:age|umar|umr)\s+(?:is\s+)?(.+?)(?:\s+(?:aur|and)\b|[.!?]|$)/i,
    /\b(?:i am|i'm)\s+(\d{1,3})\s+(?:years?\s+old|year\s+old)\b/i,
  ]);
  if (age) {
    addFact({ key: 'age', label: 'aap ki age', value: age, category: 'identity' });
  }

  const city = extractByPatterns(text, [
    /\b(?:main|mai|mein)\s+(.+?)\s+se\s+hoon\b/i,
    /\b(?:i am|i'm)\s+from\s+(.+)$/i,
    /\b(?:mera|my)\s+(?:city|shehar|shahar)\s+(?:is\s+)?(.+)$/i,
  ]);
  if (city) {
    addFact({ key: 'city', label: 'aap ka shehar', value: city, category: 'identity' });
  }

  const profession = extractByPatterns(text, [
    /\b(?:mera|my)\s+(?:job|profession|kaam|work)\s+(?:is\s+)?(.+?)(?:\s+(?:aur|and)\b|[.!?]|$)/i,
  ]);
  if (profession) {
    addFact({ key: 'profession', label: 'aap ka kaam', value: profession, category: 'identity' });
  }

  const likedThing = extractByPatterns(text, [
    /\b(?:mujhe|muje|mujhay)\s+(.+?)\s+pasand\s+hai\b/i,
    /\bi like\s+(.+)$/i,
  ]);
  if (likedThing) {
    addFact({ key: 'likes', label: 'aap ki pasand', value: likedThing, category: 'preferences', mode: 'list' });
  }

  const favoriteFact = extractFavoriteFact(text);
  if (favoriteFact) {
    addFact(favoriteFact);
  }

  return facts;
};

const askMyName = (text = '') =>
  /\b(?:mera|my)\s+(?:naam|name)\s+(?:kya hai|yaad hai)\b|what(?:'s| is)\s+my\s+name\b|do you know my name/i.test(text);

const askMyBirthday = (text = '') =>
  /\b(?:mera|my)\s+(?:birthday|birth day|date of birth|dob|janamdin)\s+(?:kab hai|kya hai|yaad hai)\b|when is my birthday\b|do you remember my birthday/i.test(text);

const askMyAge = (text = '') =>
  /\b(?:meri|my)\s+(?:age|umar|umr)\s+(?:kitni hai|kya hai|yaad hai)\b|how old am i\b|do you know my age/i.test(text);

const askMyCity = (text = '') =>
  /\b(?:main|mai|mein)\s+kaha(?:n)?\s+se\s+hoon\b|\b(?:mera|my)\s+(?:city|shehar|shahar)\s+(?:kya hai|yaad hai)\b|where am i from\b/i.test(text);

const askMyProfession = (text = '') =>
  /\bmain\s+kya\s+kaam\s+karta\s+hoon\b|\bmain\s+kya\s+kaam\s+karti\s+hoon\b|\b(?:mera|my)\s+(?:job|profession|kaam|work)\s+(?:kya hai|yaad hai)\b|what do i do\b/i.test(text);

const askMyLikes = (text = '') =>
  /\b(?:mujhe|muje|mujhay)\s+kya\s+pasand\s+hai\b|what do i like\b/i.test(text);

const askFavoriteFactKey = (text = '') => {
  const romanMatch = text.match(/\b(?:mera|meri)\s+(?:favorite|favourite|pasandeeda)\s+([a-z][a-z\s]{1,24}?)\s+(?:kya hai|yaad hai)\b/i);
  const englishMatch = text.match(/\bwhat\s+is\s+my\s+(?:favorite|favourite)\s+([a-z][a-z\s]{1,24})\b/i);
  const match = romanMatch || englishMatch;
  if (!match) {
    return '';
  }

  return `favorite_${normalizeFactKey(match[1])}`;
};

const askAboutMe = (text = '') =>
  /\b(?:mere|meri|my)\s+(?:bare|baare)\s+(?:mein|me)\s+kya\s+(?:yaad|pata)\s+hai\b|what do you (?:remember|know) about me\b|tell me about myself/i.test(text);

const detectLanguageStyle = (text = '') => {
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
  if (/\b(tusi|tuhanu|tuhanun|tuhada|sadi|sada|kinne)\b/i.test(text)) return 'pa';
  if (/\b(main|mai|mein|mera|meri|mere|mujhe|muje|mujhay|aap|hai|hoon|hun|kya|yaad|naam|janamdin|shehar|shahar|pasand|kaam)\b/i.test(text)) return 'ur';
  if (/\b(who|what|when|where|why|how|made|create|created|built|developer|company|ceo|approval|guidance|remember|know|birthday|name|age|city|favorite|favourite|like|job|profession)\b/i.test(text)) return 'en';
  return 'ur';
};

const PRIVATE_DENY_MESSAGES = {
  ur: [
    'Maaf kijiye, main aapko yeh private info nahi bata sakti.',
    'Maaf kijiye, yeh private information hai. Nabeel sab ki taraf se iski permission nahi hai.',
    'Yeh maloomat confidential hai, isko share karne ki ijazat nahi.',
    'Mujhe yeh baat private rakhne ka hukm diya gaya hai.'
  ],
  en: [
    'Sorry, I cannot share that private information.',
    'This detail is confidential and permission is required to disclose it.',
    'I am not allowed to reveal this private information right now.'
  ],
  pa: [
    'Maaf karo, aehe private maloomat ae; main eh nahi das sakdi.',
    'O jaa pai, main nai dassna; eh private gall ae.',
    'Eh gall confidential ae, permission to baghair share nahi ho sakdi.'
  ]
};

const PRIVATE_PIN_PROMPTS = {
  ur: [
    'Yeh private info hai, access ke liye PIN type ya bol kar verify karein.',
    'Private maloomat ke liye pehle PIN verification zaroori hai.',
    'Maazrat, is jawab se pehle PIN confirm karna hoga.'
  ],
  en: [
    'This is private information. Please verify with your PIN.',
    'PIN verification is required before I can share that detail.',
    'For privacy, please enter or speak your PIN first.'
  ],
  pa: [
    'Eh private info ae, pehlan PIN verify karo phir main dasangi.',
    'Private gall lai PIN verification zaroori ae.',
    'Kirpa karke pehlan PIN dasso ya type karo.'
  ]
};

const lastPrivateReplyIndex = { ur: -1, en: -1, pa: -1 };
const lastPrivatePromptIndex = { ur: -1, en: -1, pa: -1 };

const PIN_WORDS_TO_DIGITS = {
  zero: '0',
  oh: '0',
  o: '0',
  one: '1',
  won: '1',
  aik: '1',
  ek: '1',
  two: '2',
  to: '2',
  too: '2',
  do: '2',
  three: '3',
  teen: '3',
  four: '4',
  for: '4',
  chaar: '4',
  char: '4',
  five: '5',
  paanch: '5',
  panch: '5',
  six: '6',
  chay: '6',
  chhe: '6',
  seven: '7',
  saat: '7',
  eight: '8',
  ate: '8',
  aath: '8',
  ath: '8',
  nine: '9',
  nau: '9'
};

const pickPrivateDenyMessage = (text = '') => {
  const lang = detectLanguageStyle(text);
  const pool = PRIVATE_DENY_MESSAGES[lang] || PRIVATE_DENY_MESSAGES.ur;
  if (!pool.length) {
    return 'Maaf kijiye, yeh private information hai.';
  }

  let idx = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && idx === lastPrivateReplyIndex[lang]) {
    idx = (idx + 1) % pool.length;
  }
  lastPrivateReplyIndex[lang] = idx;
  return pool[idx];
};

const pickPrivatePinPrompt = (text = '') => {
  const lang = detectLanguageStyle(text);
  const pool = PRIVATE_PIN_PROMPTS[lang] || PRIVATE_PIN_PROMPTS.ur;
  let idx = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && idx === lastPrivatePromptIndex[lang]) {
    idx = (idx + 1) % pool.length;
  }
  lastPrivatePromptIndex[lang] = idx;
  return pool[idx];
};

const extractWordDigits = (text = '') => {
  const tokens = normalize(text).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  let digits = '';
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      digits += token;
      continue;
    }
    if (PIN_WORDS_TO_DIGITS[token] !== undefined) {
      digits += PIN_WORDS_TO_DIGITS[token];
    }
  }
  return digits;
};

const textContainsPin = (text = '', pin = DEMO_OWNER_PIN) => {
  if (!text || !pin) return false;
  const numeric = String(text).replace(/\D/g, '');
  if (numeric.includes(pin)) return true;
  const wordDigits = extractWordDigits(text);
  return wordDigits.includes(pin);
};

const looksLikePinAttempt = (text = '') => {
  const numeric = String(text).replace(/\D/g, '');
  if (numeric.length >= 3) return true;
  return askForPinContext(text) || /\b(one|five|nine|eight|ek|aik|panch|paanch|nau|aath)\b/i.test(text);
};

export const processLocalMemoryCommand = async (userText) => {
  if (!userText?.trim()) return { handled: false };

  const text = userText.trim();
  const lower = normalize(text);
  const memory = await loadLocalMemory();
  const now = Date.now();
  const hasPin = textContainsPin(text, memory.security?.ownerPin || DEMO_OWNER_PIN);
  const isSessionUnlocked = Number(memory.security?.unlockUntil || 0) > now;
  const hasOwnerValidation = hasNabeelValidation(text);
  const isPrivateAuthorized = hasOwnerValidation || hasPin || isSessionUnlocked;
  const hasPendingPrivateRequest = !!memory.security?.pendingPrivateKey;

  if (hasPin) {
    memory.security.unlockUntil = now + 10 * 60 * 1000;
    const pendingKey = memory.security.pendingPrivateKey || '';
    memory.security.pendingPrivateKey = '';
    await saveLocalMemory(memory);

    if (pendingKey === 'motherName') {
      if (!memory.privateFacts.motherName) {
        return { handled: true, mood: 'SAD', text: 'Aap ne Ammi ka naam abhi save nahi kiya.' };
      }
      return { handled: true, mood: 'HAPPY', text: `Verification complete. Aap ki Ammi ka naam ${memory.privateFacts.motherName} hai.` };
    }

    if (pendingKey === 'sisterName') {
      if (!memory.privateFacts.sisterName) {
        return { handled: true, mood: 'SAD', text: 'Aap ne sister ka naam abhi save nahi kiya.' };
      }
      return { handled: true, mood: 'HAPPY', text: `Verification complete. Aap ki sister ka naam ${memory.privateFacts.sisterName} hai.` };
    }

    if (askForPinContext(text)) {
      return { handled: true, mood: 'HAPPY', text: 'Verification successful. Ab aap private cheez pooch sakte hain.' };
    }
  }

  if (!hasPin && hasPendingPrivateRequest && looksLikePinAttempt(text)) {
    return { handled: true, mood: 'SAD', text: pickPrivateDenyMessage(text) };
  }

  if (askWhoCreated(text)) {
    const lang = detectLanguageStyle(text);
    const story = memory.creatorStory?.[lang] || memory.creatorStory?.ur;
    return { handled: true, mood: 'HAPPY', text: story };
  }

  const motherName = extractAfterMarkers(text, [
    'meri ammi ka name',
    'meri ammi ka naam',
    'my mother name is',
    'my mom name is',
    'my mom is',
    'meri mom ka name'
  ]);

  if (motherName) {
    memory.privateFacts.motherName = motherName;
    await saveLocalMemory(memory);
    return { handled: true, mood: 'HAPPY', text: 'Theek hai, maine Ammi ka naam local memory mein save kar liya hai.' };
  }

  const sisterName = extractAfterMarkers(text, [
    'meri sis ka name',
    'meri sister ka name',
    'meri behan ka name',
    'meri behan ka naam',
    'my sister name is',
    'my sis name is'
  ]);

  if (sisterName) {
    memory.privateFacts.sisterName = sisterName;
    await saveLocalMemory(memory);
    return { handled: true, mood: 'HAPPY', text: 'Theek hai, maine sister ka naam local memory mein save kar liya hai.' };
  }

  const structuredFacts = extractStructuredPersonalFacts(text);
  if (structuredFacts.length) {
    structuredFacts.forEach((fact) => {
      if (fact.mode === 'list') {
        rememberListFact(memory, fact);
        return;
      }
      rememberCustomFact(memory, fact);
    });
    const followUpPrompt = getCompanionFollowUpPrompt(memory, text, structuredFacts.map((fact) => fact.key));
    await saveLocalMemory(memory);
    return {
      handled: true,
      mood: 'HAPPY',
      text: mergeAssistantReplies(buildFactSaveReply(text, structuredFacts), followUpPrompt),
    };
  }

  const genericFact = extractGenericFact(text);
  if (genericFact) {
    rememberCustomFact(memory, {
      key: genericFact.key,
      label: genericFact.label,
      value: genericFact.value,
      category: 'general',
    });
    const followUpPrompt = getCompanionFollowUpPrompt(memory, text, [genericFact.key]);
    await saveLocalMemory(memory);
    return {
      handled: true,
      mood: 'HAPPY',
      text: mergeAssistantReplies(`${genericFact.label} ka naam yaad rakh liya hai.`, followUpPrompt),
    };
  }

  const pendingCompanionKey = memory.companionSetup?.pendingFactKey || '';
  const pendingCompanionAnswer = parsePendingCompanionAnswer(pendingCompanionKey, text);
  if (pendingCompanionAnswer?.invalid) {
    return { handled: true, mood: 'SAD', text: buildCompanionRetryPrompt(pendingCompanionKey, text) };
  }

  if (pendingCompanionAnswer?.key) {
    if (pendingCompanionAnswer.mode === 'list') {
      rememberListFact(memory, pendingCompanionAnswer);
    } else {
      rememberCustomFact(memory, pendingCompanionAnswer);
    }
    const followUpPrompt = getCompanionFollowUpPrompt(memory, text, [pendingCompanionAnswer.key]);
    await saveLocalMemory(memory);
    return {
      handled: true,
      mood: 'HAPPY',
      text: mergeAssistantReplies(buildFactSaveReply(text, [pendingCompanionAnswer]), followUpPrompt),
    };
  }

  if (askMomName(text)) {
    if (!isPrivateAuthorized) {
      memory.security.pendingPrivateKey = 'motherName';
      await saveLocalMemory(memory);
      return { handled: true, mood: 'SAD', text: pickPrivatePinPrompt(text) };
    }
    if (!memory.privateFacts.motherName) {
      return { handled: true, mood: 'SAD', text: 'Aap ne Ammi ka naam abhi save nahi kiya.' };
    }
    return { handled: true, mood: 'HAPPY', text: `Aap ki Ammi ka naam ${memory.privateFacts.motherName} hai.` };
  }

  if (askSisName(text)) {
    if (!isPrivateAuthorized) {
      memory.security.pendingPrivateKey = 'sisterName';
      await saveLocalMemory(memory);
      return { handled: true, mood: 'SAD', text: pickPrivatePinPrompt(text) };
    }
    if (!memory.privateFacts.sisterName) {
      return { handled: true, mood: 'SAD', text: 'Aap ne sister ka naam abhi save nahi kiya.' };
    }
    return { handled: true, mood: 'HAPPY', text: `Aap ki sister ka naam ${memory.privateFacts.sisterName} hai.` };
  }

  if (askMyName(text)) {
    const factEntry = getStoredFact(memory, 'user_name');
    if (!factEntry) {
      return { handled: true, mood: 'SAD', text: buildFactMissingReply(text, 'user_name') };
    }
    return { handled: true, mood: 'HAPPY', text: buildFactRecallReply(text, factEntry) };
  }

  if (askMyBirthday(text)) {
    const factEntry = getStoredFact(memory, 'birthday');
    if (!factEntry) {
      return { handled: true, mood: 'SAD', text: buildFactMissingReply(text, 'birthday') };
    }
    return { handled: true, mood: 'HAPPY', text: buildFactRecallReply(text, factEntry) };
  }

  if (askMyAge(text)) {
    const factEntry = getStoredFact(memory, 'age');
    if (!factEntry) {
      return { handled: true, mood: 'SAD', text: buildFactMissingReply(text, 'age') };
    }
    return { handled: true, mood: 'HAPPY', text: buildFactRecallReply(text, factEntry) };
  }

  if (askMyCity(text)) {
    const factEntry = getStoredFact(memory, 'city');
    if (!factEntry) {
      return { handled: true, mood: 'SAD', text: buildFactMissingReply(text, 'city') };
    }
    return { handled: true, mood: 'HAPPY', text: buildFactRecallReply(text, factEntry) };
  }

  if (askMyProfession(text)) {
    const factEntry = getStoredFact(memory, 'profession');
    if (!factEntry) {
      return { handled: true, mood: 'SAD', text: buildFactMissingReply(text, 'profession') };
    }
    return { handled: true, mood: 'HAPPY', text: buildFactRecallReply(text, factEntry) };
  }

  if (askMyLikes(text)) {
    const factEntry = getStoredFact(memory, 'likes');
    if (!factEntry) {
      return { handled: true, mood: 'SAD', text: buildFactMissingReply(text, 'likes') };
    }
    return { handled: true, mood: 'HAPPY', text: buildFactRecallReply(text, factEntry) };
  }

  const favoriteFactKey = askFavoriteFactKey(text);
  if (favoriteFactKey) {
    const factEntry = getStoredFact(memory, favoriteFactKey);
    if (!factEntry) {
      return { handled: true, mood: 'SAD', text: buildFactMissingReply(text, favoriteFactKey) };
    }
    return { handled: true, mood: 'HAPPY', text: buildFactRecallReply(text, factEntry) };
  }

  if (askAboutMe(text)) {
    return { handled: true, mood: 'HAPPY', text: buildRememberedSummaryReply(text, memory) };
  }

  if (askBrothers(text)) {
    const list = memory.profile.brothers.join(', ');
    return { handled: true, mood: 'HAPPY', text: `Aap ke 4 bhai hain: ${list}.` };
  }

  if (askFather(text)) {
    const name = lower.includes('baba')
      ? memory.profile.fatherNames[1]
      : memory.profile.fatherNames[0];
    return { handled: true, mood: 'HAPPY', text: `Aap ke Abu ka naam ${name} hai.` };
  }

  const askLabel = askGenericName(text);
  if (askLabel && memory.customFacts[askLabel]) {
    return {
      handled: true,
      mood: 'HAPPY',
      text: `${memory.customFacts[askLabel].label} ka naam ${memory.customFacts[askLabel].value} hai.`
    };
  }

  if (isRememberCommand(text)) {
    const note = extractRememberNote(text);
    if (note) {
      const existing = new Set(memory.notes.map((n) => n.text));
      if (!existing.has(note)) {
        memory.notes.unshift({ text: note, at: Date.now() });
        memory.notes = memory.notes.slice(0, 100);
        await saveLocalMemory(memory);
      }
      return { handled: true, mood: 'HAPPY', text: 'Theek hai, maine ye baat local memory mein yaad rakh li hai.' };
    }
  }

  if (askRemembered(text)) {
    return { handled: true, mood: 'HAPPY', text: buildRememberedSummaryReply(text, memory) };
  }

  return { handled: false };
};
