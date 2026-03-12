import { Linking, NativeModules, Platform } from 'react-native';

const nativeBridge = NativeModules.SoniyaAndroidBridge;
const APP_QUERY_ALIASES = {
  fb: 'facebook',
  insta: 'instagram',
  ig: 'instagram',
  yt: 'youtube',
  chrome: 'chrome',
  browser: 'chrome',
  gmail: 'gmail',
  gmaps: 'google maps',
  maps: 'google maps',
  messages: 'messages',
  msg: 'messages',
  messenger: 'messenger',
  phone: 'phone',
  dialer: 'phone',
  camera: 'camera',
  settings: 'settings',
  gallery: 'gallery',
  photos: 'gallery',
  whatsapp: 'com.whatsapp',
  'whats app': 'com.whatsapp',
  wa: 'com.whatsapp',
  youtube: 'com.google.android.youtube',
  facebook: 'com.facebook.katana',
  messengerapp: 'com.facebook.orca',
  messengerchat: 'com.facebook.orca',
  instagram: 'com.instagram.android',
  playstore: 'com.android.vending',
  'play store': 'com.android.vending',
  telegram: 'org.telegram.messenger',
  snapchat: 'com.snapchat.android',
  tiktok: 'com.zhiliaoapp.musically',
  twitter: 'com.twitter.android',
  x: 'com.twitter.android',
};

const defaultStatus = {
  bridgeAvailable: false,
  notificationAccessEnabled: false,
  listenerConnected: false,
  listenerConnectedAt: 0,
  foregroundServiceActive: false,
  foregroundServiceStartedAt: 0,
  storedCount: 0,
};

const defaultLaunchResult = {
  ok: false,
  installed: false,
  bridgeAvailable: false,
  packageName: '',
  appName: '',
  query: '',
  reason: 'bridge_unavailable',
};

const safeNativeCall = async (fn, fallbackValue) => {
  try {
    return await fn();
  } catch (_error) {
    return fallbackValue;
  }
};

export const isNativeStageFourBridgeAvailable = () => (
  Platform.OS === 'android' && !!nativeBridge
);

export const getNativeBridgeStatus = async () => {
  if (nativeBridge?.getServiceStatus) {
    const rawStatus = await safeNativeCall(() => nativeBridge.getServiceStatus(), defaultStatus);
    return {
      ...defaultStatus,
      ...rawStatus,
      assistantServiceActive: rawStatus?.foregroundServiceActive ?? false,
      floatingBubbleActive: !!nativeBridge?.showFloatingBubble,
    };
  }

  return defaultStatus;
};

export const openNotificationListenerSettings = async () => {
  if (nativeBridge?.openNotificationListenerSettings) {
    return safeNativeCall(() => nativeBridge.openNotificationListenerSettings(), false);
  }

  if (Platform.OS === 'android' && typeof Linking.sendIntent === 'function') {
    return safeNativeCall(
      () => Linking.sendIntent('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS'),
      false
    );
  }

  return false;
};

export const startNativeAssistantService = async () => {
  if (nativeBridge?.startAssistantService) {
    return safeNativeCall(() => nativeBridge.startAssistantService(), false);
  }

  return false;
};

export const requestNativeNotificationRebind = async () => {
  if (nativeBridge?.requestNotificationRebind) {
    return safeNativeCall(() => nativeBridge.requestNotificationRebind(), false);
  }

  return false;
};

export const getCapturedNotifications = async () => {
  if (nativeBridge?.getCapturedNotifications) {
    return safeNativeCall(() => nativeBridge.getCapturedNotifications(), []);
  }

  return [];
};

export const clearCapturedNotifications = async () => {
  if (nativeBridge?.clearCapturedNotifications) {
    return safeNativeCall(() => nativeBridge.clearCapturedNotifications(), false);
  }

  return false;
};

const normalizeAppLaunchQuery = (value = '') => (
  String(value || '')
    .toLowerCase()
    .replace(/\b(app|please|plz|zara|for me)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const resolveLaunchQuery = (appQuery = '') => {
  const normalizedQuery = normalizeAppLaunchQuery(appQuery);
  if (!normalizedQuery) {
    return '';
  }

  const compactQuery = normalizedQuery.replace(/\s+/g, '');
  return APP_QUERY_ALIASES[normalizedQuery]
    || APP_QUERY_ALIASES[compactQuery]
    || normalizedQuery;
};

export const launchInstalledApp = async (appQuery = '') => {
  const resolvedQuery = resolveLaunchQuery(appQuery);

  if (!resolvedQuery) {
    return {
      ...defaultLaunchResult,
      query: '',
      reason: 'missing_query',
    };
  }

  if (nativeBridge?.launchApp) {
    const result = await safeNativeCall(
      () => nativeBridge.launchApp(resolvedQuery),
      {
        ...defaultLaunchResult,
        bridgeAvailable: isNativeStageFourBridgeAvailable(),
        query: resolvedQuery,
      }
    );

    return {
      ...defaultLaunchResult,
      bridgeAvailable: true,
      query: resolvedQuery,
      ...result,
    };
  }

  if (Platform.OS === 'android' && typeof Linking.sendIntent === 'function' && resolvedQuery === 'settings') {
    const opened = await safeNativeCall(
      () => Linking.sendIntent('android.settings.SETTINGS'),
      false
    );

    return {
      ...defaultLaunchResult,
      ok: Boolean(opened),
      installed: Boolean(opened),
      bridgeAvailable: false,
      appName: 'Settings',
      query: resolvedQuery,
      reason: opened ? '' : 'bridge_unavailable',
    };
  }

  return {
    ...defaultLaunchResult,
    bridgeAvailable: isNativeStageFourBridgeAvailable(),
    query: resolvedQuery,
  };
};

export const performNativeCall = async (contactQuery = '') => {
  if (!contactQuery) return { ok: false, reason: 'missing_contact' };

  if (nativeBridge?.dialNumber) {
    return await safeNativeCall(() => nativeBridge.dialNumber(contactQuery), { ok: false });
  }

  // Fallback: Open dialer with the name/number if possible
  const url = `tel:${contactQuery}`;
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
    return { ok: true, fallback: true };
  }

  return { ok: false, reason: 'unsupported' };
};

export const performNativeScroll = async (direction = 'DOWN') => {
  if (nativeBridge?.performScroll) {
    const forward = direction === 'DOWN';
    return await safeNativeCall(() => nativeBridge.performScroll(forward), { ok: false });
  }

  return { ok: false, reason: 'accessibility_service_required' };
};

export const getAccessibilityStatus = async () => {
  if (nativeBridge?.getAccessibilityStatus) {
    return await safeNativeCall(() => nativeBridge.getAccessibilityStatus(), { enabled: false });
  }
  return { enabled: false };
};

export const performClickByText = async (text = '') => {
  if (!text) return { ok: false };
  if (nativeBridge?.clickByText) {
    const success = await safeNativeCall(() => nativeBridge.clickByText(text), false);
    return { ok: success };
  }
  return { ok: false, reason: 'bridge_unavailable' };
};

export const performTypeText = async (text = '') => {
  if (!text) return { ok: false };
  if (nativeBridge?.typeText) {
    const success = await safeNativeCall(() => nativeBridge.typeText(text), false);
    return { ok: success };
  }
  return { ok: false, reason: 'bridge_unavailable' };
};

export const showFloatingBubble = async () => {
  if (nativeBridge?.showFloatingBubble) {
    return await safeNativeCall(() => nativeBridge.showFloatingBubble(), false);
  }
  return false;
};

export const hideFloatingBubble = async () => {
  if (nativeBridge?.hideFloatingBubble) {
    return await safeNativeCall(() => nativeBridge.hideFloatingBubble(), false);
  }
  return false;
};

export const stopAssistantService = async () => {
  if (nativeBridge?.stopAssistantService) {
    return await safeNativeCall(() => nativeBridge.stopAssistantService(), false);
  }
  return false;
};

export const performWebSearch = async (searchQuery = '') => {
  if (!searchQuery) return { ok: false };

  const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
    return { ok: true };
  }

  return { ok: false, reason: 'browser_unavailable' };
};

export const performSystemAdjust = async (target = 'VOLUME', action = 'INCREASE') => {
  if (nativeBridge?.adjustSystemSetting) {
    return await safeNativeCall(() => nativeBridge.adjustSystemSetting(target, action), { ok: false });
  }

  return { ok: false, reason: 'bridge_unavailable' };
};

export const performSystemToggle = async (target = 'WIFI', action = 'ON') => {
  if (nativeBridge?.toggleSystemSetting) {
    return await safeNativeCall(() => nativeBridge.toggleSystemSetting(target, action), { ok: false });
  }

  return { ok: false, reason: 'bridge_unavailable' };
};
