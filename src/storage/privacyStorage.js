import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_OWNER_PIN } from '../constants/appConfig';

const PRIVACY_STORAGE_KEY = '@soniya_agentic_ai_privacy_v1';
const SESSION_UNLOCK_MS = 10 * 60 * 1000;
const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 8;

export const DEFAULT_PRIVACY_STATE = {
  ownerPin: DEMO_OWNER_PIN,
  unlockUntil: 0,
  lastVerifiedAt: 0,
};

export const normalizePrivacyState = (storedValue = {}) => ({
  ...DEFAULT_PRIVACY_STATE,
  ...(storedValue && typeof storedValue === 'object' ? storedValue : {}),
});

export const normalizePinInput = (pinInput = '') => String(pinInput || '').replace(/\D/g, '');

export const isDefaultPrivacyPin = (privacyState) => (
  normalizePrivacyState(privacyState).ownerPin === DEMO_OWNER_PIN
);

export const validatePrivacyPinDraft = (pinInput = '') => {
  const normalizedPin = normalizePinInput(pinInput);
  if (normalizedPin.length < PIN_MIN_LENGTH || normalizedPin.length > PIN_MAX_LENGTH) {
    return {
      ok: false,
      pin: normalizedPin,
      message: `PIN ${PIN_MIN_LENGTH} se ${PIN_MAX_LENGTH} digits ka hona chahiye.`,
    };
  }

  return {
    ok: true,
    pin: normalizedPin,
    message: '',
  };
};

export const loadPrivacyState = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(PRIVACY_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_PRIVACY_STATE;
    }

    return normalizePrivacyState(JSON.parse(rawValue));
  } catch (_error) {
    return DEFAULT_PRIVACY_STATE;
  }
};

export const savePrivacyState = async (nextState) => {
  const mergedState = normalizePrivacyState(nextState);
  await AsyncStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(mergedState));
  return mergedState;
};

export const isPrivacyUnlocked = (privacyState, now = Date.now()) => {
  const safeState = normalizePrivacyState(privacyState);
  return Number(safeState.unlockUntil || 0) > now;
};

export const verifyPrivacyPin = (privacyState, pinInput, now = Date.now()) => {
  const safeState = normalizePrivacyState(privacyState);
  const normalizedPin = normalizePinInput(pinInput);

  if (normalizedPin && normalizedPin === safeState.ownerPin) {
    return {
      ok: true,
      state: {
        ...safeState,
        unlockUntil: now + SESSION_UNLOCK_MS,
        lastVerifiedAt: now,
      },
    };
  }

  return {
    ok: false,
    state: safeState,
  };
};

export const updatePrivacyPin = (privacyState, {
  currentPin = '',
  nextPin = '',
  confirmPin = '',
  now = Date.now(),
} = {}) => {
  const safeState = normalizePrivacyState(privacyState);
  const currentNormalized = normalizePinInput(currentPin);
  const nextValidation = validatePrivacyPinDraft(nextPin);
  const confirmNormalized = normalizePinInput(confirmPin);

  if (!currentNormalized || currentNormalized !== safeState.ownerPin) {
    return {
      ok: false,
      state: safeState,
      message: 'Current PIN sahi nahi hai.',
    };
  }

  if (!nextValidation.ok) {
    return {
      ok: false,
      state: safeState,
      message: nextValidation.message,
    };
  }

  if (nextValidation.pin !== confirmNormalized) {
    return {
      ok: false,
      state: safeState,
      message: 'New PIN aur confirm PIN match nahi karte.',
    };
  }

  if (nextValidation.pin === safeState.ownerPin) {
    return {
      ok: false,
      state: safeState,
      message: 'Naya PIN current PIN se different hona chahiye.',
    };
  }

  return {
    ok: true,
    state: {
      ...safeState,
      ownerPin: nextValidation.pin,
      unlockUntil: 0,
      lastVerifiedAt: now,
    },
    message: 'PIN update ho gaya hai. Privacy lock dobara active kar diya gaya hai.',
  };
};

export const buildLockedPrivacyState = (privacyState) => ({
  ...normalizePrivacyState(privacyState),
  unlockUntil: 0,
});
