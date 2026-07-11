import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface Config {
  ollama: {
    host: string;
    model: string;
  };
}

const DEFAULTS: Config = {
  ollama: {
    host: 'http://localhost:11434',
    model: 'llama3.2',
  },
};

function configPath(): string {
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
    };
  } catch (err) {
    console.warn(`config invalid: ${(err as Error).message} — AI disabled`);
    return null;
  }
}
