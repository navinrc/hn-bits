import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface Config {
  ollama: {
    host: string;
    model: string;
  };
  telegram?: {
    enabled: boolean;
    botToken?: string;
    chatId?: string;
  };
  desktopNotifications?: {
    enabled: boolean;
    timeoutSeconds: number;
  };
}

export const DEFAULT_OLLAMA_CONFIG = {
  host: 'http://localhost:11434',
  model: 'llama3.2',
};

const DEFAULTS: Config = {
  ollama: DEFAULT_OLLAMA_CONFIG,
};

/** Shown in the summary panel / Ask AI view when no config file is present. */
export const AI_SETUP_HINT_LINES = [
  'AI not configured.',
  '1. Install Ollama and pull a model:  ollama pull llama3.2',
  '2. Create ~/.config/hn-bits/config.json:',
  '   { "ollama": { "host": "http://localhost:11434", "model": "llama3.2" } }',
];

export function configPath(): string {
  return process.env.HN_BITS_CONFIG || join(homedir(), '.config', 'hn-bits', 'config.json');
}

function readConfigFile(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

/** Loads AI config from disk. Returns null if absent; never throws — invalid JSON warns and falls back to absent. */
export function loadConfig(): Config | null {
  const raw = readConfigFile(configPath());
  if (raw == null) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      ollama: {
        host: parsed.ollama?.host ?? DEFAULTS.ollama.host,
        model: parsed.ollama?.model ?? DEFAULTS.ollama.model,
      },
      telegram: parsed.telegram,
      desktopNotifications: parsed.desktopNotifications && {
        enabled: parsed.desktopNotifications.enabled,
        timeoutSeconds: parsed.desktopNotifications.timeoutSeconds ?? 10,
      },
    };
  } catch (err) {
    console.warn(`config invalid: ${(err as Error).message} — AI disabled`);
    return null;
  }
}
