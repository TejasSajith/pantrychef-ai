export type AIProvider = 'server' | 'groq' | 'openai' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  groqModel: string;
  openaiModel: string;
  ollamaEndpoint: string;
  ollamaModel: string;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'server',
  apiKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  openaiModel: 'gpt-4o-mini',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
};

export const PROVIDER_META: Record<
  AIProvider,
  {
    label: string;
    shortLabel: string;
    icon: string;
    desc: string;
  }
> = {
  server: {
    label: 'PantryChef Cloud',
    shortLabel: 'Cloud',
    icon: '☁️',
    desc: "Zero setup · uses the app's built-in Groq key",
  },
  groq: {
    label: 'Groq (BYOK)',
    shortLabel: 'Groq',
    icon: '⚡',
    desc: 'Bring your own Groq API key — fast, free tier available',
  },
  openai: {
    label: 'OpenAI (BYOK)',
    shortLabel: 'OpenAI',
    icon: '🧠',
    desc: 'Use GPT-4o-mini or any OpenAI model with your key',
  },
  ollama: {
    label: 'Ollama (Local)',
    shortLabel: 'Local',
    icon: '💻',
    desc: 'Run AI fully offline on your own machine',
  },
};

const STORAGE_KEY = 'pantrychef_ai_config';

export function loadAIConfig(): AIConfig {
  if (typeof window === 'undefined') return DEFAULT_AI_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_CONFIG;
    return { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function saveAIConfig(config: AIConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
