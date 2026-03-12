export const APP_NAME = 'Soniya Agentic AI';
export const APP_TAGLINE = 'Privacy-first romantic and friendly AI companion for Android';
export const APP_STAGE = 'Stage 7 In Progress: Full phone automation, accessibility service actions, and floating overlay companion';
export const DEMO_OWNER_PIN = '1598';

export const DEFAULT_SETTINGS = {
  assistantActive: true,
  showFloatingBubble: true,
  readMessagesAutomatically: false,
  askBeforeReply: true,
  voiceNotifications: true,
  romanticCompanionMode: true,
  presenceMode: false,
  privacyLock: true,
  aiCommandAssist: true,
};

export const SETTING_DEFINITIONS = [
  {
    key: 'assistantActive',
    title: 'Assistant Active',
    description: 'Toggle Soniya service on or off. When off, background listener and voice capture are paused.',
  },
  {
    key: 'showFloatingBubble',
    title: 'Floating Companion Bubble',
    description: 'Show a small Soniya icon on top of other apps so you know she is listening and ready.',
  },
  {
    key: 'readMessagesAutomatically',
    title: 'Read messages automatically',
    description: 'Keep this off so the assistant never opens or reads messages without confirmation.',
  },
  {
    key: 'askBeforeReply',
    title: 'Ask before reply',
    description: 'Every reply action must be confirmed by the user first.',
  },
  {
    key: 'voiceNotifications',
    title: 'Voice notifications',
    description: 'Speak sender alerts only after the user allows the assistant to talk.',
  },
  {
    key: 'romanticCompanionMode',
    title: 'Romantic companion tone',
    description: 'Keep Soniya warm, lovely, and friendly in notifications, replies, and voice lines.',
  },
  {
    key: 'presenceMode',
    title: 'Presence mode',
    description: 'Pause spoken alerts when the user wants quiet mode.',
  },
  {
    key: 'privacyLock',
    title: 'Privacy lock',
    description: 'Require PIN before sender lists or message content can be shown.',
  },
  {
    key: 'aiCommandAssist',
    title: 'AI command assist',
    description: 'Reserve Groq and OpenRouter for sanitized command intent only.',
  },
];

export const REQUIRED_PERMISSIONS = [
  {
    id: 'notification',
    title: 'Notification Access',
    detail: 'Detect WhatsApp notifications without opening the app or chat.',
    support: 'Needs Expo dev build plus native Android notification listener integration.',
  },
  {
    id: 'microphone',
    title: 'Microphone',
    detail: 'Used for wake word, confirmations, and voice commands.',
    support: 'Can be requested in Expo.',
  },
  {
    id: 'foreground',
    title: 'Foreground Service',
    detail: 'Keeps the assistant active while Android is running background limits.',
    support: 'Needs Android service integration during prebuild/native stage.',
  },
  {
    id: 'boot',
    title: 'Boot Completed',
    detail: 'Restart the assistant after a device reboot.',
    support: 'Needs Android receiver integration during prebuild/native stage.',
  },
];

export const SYSTEM_MODULES = [
  'Notification Listener Service',
  'Message Processing Engine',
  'Voice Command Engine',
  'AI Intent Detection',
  'Privacy Layer',
  'Local Storage',
  'Settings Panel',
];

export const PRIVACY_RULES = [
  'All user data stays on the device.',
  'Never open messages automatically.',
  'Ask before reading message content.',
  'Ask before sending replies.',
  'PIN is required before listing senders or reading protected content.',
  'Private message text must not be sent to Groq or OpenRouter.',
  'Warm, romantic, and friendly tone can stay active, but consent and privacy rules stay mandatory.',
];

export const COMPANION_PERSONA = {
  title: 'Warm companion tone',
  description: 'Soniya should stay romantic, lovely, and friendly while still respecting consent, PIN checks, and privacy-first behavior.',
  samples: [
    'Jani, Nabeel ne message bheja hai. Kya aap sunna chahte hain?',
    'Jaan, kya main is sender ka message PIN verify hone ke baad suna doon?',
    'Lovely tone active hai, lekin private data ab bhi device se bahar nahi jayega.',
  ],
};

export const ROADMAP = [
  {
    title: 'Stage 1',
    status: 'Completed',
    detail: 'Rebrand the app, build the Expo shell, and lock the design toward local-first behavior.',
  },
  {
    title: 'Stage 2',
    status: 'Completed',
    detail: 'Local message rules, PIN-gated flows, and the Expo command-center workflow are now active.',
  },
  {
    title: 'Stage 3',
    status: 'Completed',
    detail: 'Mic-driven command capture and spoken assistant replies are wired with a dev-build fallback strategy.',
  },
  {
    title: 'Stage 4',
    status: 'Completed',
    detail: 'Expo prebuild, Android notification listener, reboot handling, foreground service, and local inbox sync are now wired.',
  },
  {
    title: 'Stage 5',
    status: 'Completed',
    detail: 'Companion UI tuning, stronger personal memory, and proactive profile capture are now wired locally.',
  },
  {
    title: 'Stage 6',
    status: 'Completed',
    detail: 'Privacy hardening is active with custom PIN controls, lock management, reduced PIN exposure, and native app launch commands.',
  },
  {
    title: 'Stage 7',
    status: 'In Progress',
    detail: 'Full phone automation via Accessibility Service, System controls (Volume/Brightness/WiFi), and Floating Companion Overlay for background monitoring.',
  },
];
