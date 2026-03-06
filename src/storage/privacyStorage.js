import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_OWNER_PIN } from '../constants/appConfig';

const PRIVACY_STORAGE_KEY = '@soniya_agentic_ai_privacy_v1';
const SESSION_UNLOCK_MS = 10 * 60 * 1000;

export const DEFAULT_PRIVACY_STATE = {
  ownerPin: DEMO_OWNER_PIN,
  unlockUntil: 0,
  lastVerifiedAt: 0,
};

export const normalizePrivacyState = (storedValue = {}) => ({
  ...DEFAULT_PRIVACY_STATE,
  ...(storedValue && typeof storedValue === 'object' ? storedValue : {}),
});

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
  const normalizedPin = String(pinInput || '').replace(/\D/g, '');

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

export const buildLockedPrivacyState = (privacyState) => ({
  ...normalizePrivacyState(privacyState),
  unlockUntil: 0,
});
