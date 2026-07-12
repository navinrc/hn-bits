import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { configPath, DEFAULT_OLLAMA_CONFIG, loadConfig } from './config.js';
import { CONFIG_KEYS, formatValue, parseValue, type ConfigKeyDef } from './configKeys.js';

type RawConfig = Record<string, Record<string, unknown> | undefined>;

function requireKeyDef(key: string): ConfigKeyDef {
  const def = CONFIG_KEYS[key];
  if (!def) throw new Error(`unknown config key: '${key}'`);
  return def;
}

/** Raw parsed config, never merged with defaults — {} if the file is absent or invalid. */
export function readRawConfig(): RawConfig {
  try {
    return JSON.parse(readFileSync(configPath(), 'utf-8')) as RawConfig;
  } catch {
    return {};
  }
}

export function writeRawConfig(config: RawConfig): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
}

function resolveValue(key: string): string | number | boolean | undefined {
  const [section, field] = requireKeyDef(key).path;
  const merged = loadConfig();
  if (section === 'ollama') {
    const ollama = merged?.ollama ?? DEFAULT_OLLAMA_CONFIG;
    return (ollama as Record<string, unknown>)[field] as string;
  }
  const sectionValue = merged?.[section as 'telegram' | 'desktopNotifications' | 'ui'];
  return (sectionValue as Record<string, unknown> | undefined)?.[field] as
    | string
    | number
    | boolean
    | undefined;
}

/** Raw, unmasked value for `config get` — meant to be scripted/piped. */
export function getConfigValue(key: string): string | undefined {
  const value = resolveValue(key);
  return value === undefined ? undefined : String(value);
}

export function setConfigValue(key: string, rawValue: string): void {
  const def = requireKeyDef(key);
  const value = parseValue(def, rawValue);
  const [section, field] = def.path;
  const config = readRawConfig();
  config[section] = { ...config[section], [field]: value };
  writeRawConfig(config);
}

export function unsetConfigValue(key: string): void {
  const [section, field] = requireKeyDef(key).path;
  const config = readRawConfig();
  const sectionValue = config[section];
  if (!sectionValue) return;
  delete sectionValue[field];
  if (Object.keys(sectionValue).length === 0) delete config[section];
  writeRawConfig(config);
}

export function listConfigEntries(): Array<{ key: string; value: string | undefined }> {
  return Object.entries(CONFIG_KEYS).map(([key, def]) => {
    const value = resolveValue(key);
    return { key, value: value === undefined ? undefined : formatValue(def, value) };
  });
}
