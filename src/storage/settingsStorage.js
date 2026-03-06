import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from '../constants/appConfig';

const SETTINGS_STORAGE_KEY = '@soniya_agentic_ai_settings_v1';

const normalizeStoredSettings = (storedValue = {}) => ({
  ...DEFAULT_SETTINGS,
  ...(storedValue && typeof storedValue === 'object' ? storedValue : {}),
});

export const loadAgentSettings = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_SETTINGS;
    }

    return normalizeStoredSettings(JSON.parse(rawValue));
  } catch (_error) {
    return DEFAULT_SETTINGS;
  }
};

export const saveAgentSettings = async (nextSettings) => {
  const mergedSettings = normalizeStoredSettings(nextSettings);
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(mergedSettings));
  return mergedSettings;
};
