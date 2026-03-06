const GROQ_BASE_URL = process.env.EXPO_PUBLIC_GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const OPENROUTER_BASE_URL = process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

export const PROVIDER_RULES = [
  'Groq and OpenRouter are optional command-assist providers, not storage providers.',
  'Private message content stays on device and must not be sent to either provider.',
  'Only sanitized tasks such as "reply politely" or "schedule meeting" may be routed later.',
  'Expo public env keys are not a production-safe secret strategy. Final production flow should use a secure proxy.',
];

export const getProviderStatus = () => [
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: GROQ_BASE_URL,
    mode: 'Primary command assist',
    configured: Boolean(process.env.EXPO_PUBLIC_GROQ_BASE_URL || process.env.EXPO_PUBLIC_GROQ_API_KEY),
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: OPENROUTER_BASE_URL,
    mode: 'Fallback command assist',
    configured: Boolean(process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY),
  },
];
