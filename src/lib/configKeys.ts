export type ConfigValueType = 'string' | 'boolean' | 'number';

export interface ConfigKeyDef {
  path: readonly [section: string, field: string];
  type: ConfigValueType;
  sensitive?: boolean;
}

export const CONFIG_KEYS: Record<string, ConfigKeyDef> = {
  'ollama.host': { path: ['ollama', 'host'], type: 'string' },
  'ollama.model': { path: ['ollama', 'model'], type: 'string' },
  'telegram.enabled': { path: ['telegram', 'enabled'], type: 'boolean' },
  'telegram.botToken': { path: ['telegram', 'botToken'], type: 'string', sensitive: true },
  'telegram.chatId': { path: ['telegram', 'chatId'], type: 'string' },
  'desktopNotifications.enabled': { path: ['desktopNotifications', 'enabled'], type: 'boolean' },
  'desktopNotifications.timeoutSeconds': { path: ['desktopNotifications', 'timeoutSeconds'], type: 'number' },
};

/** Coerces a CLI string argument to the key's declared type. Throws on invalid input. */
export function parseValue(def: ConfigKeyDef, raw: string): string | number | boolean {
  if (def.type === 'boolean') {
    if (raw !== 'true' && raw !== 'false') throw new Error(`expected 'true' or 'false', got '${raw}'`);
    return raw === 'true';
  }
  if (def.type === 'number') {
    const value = Number(raw);
    if (Number.isNaN(value)) throw new Error(`expected a number, got '${raw}'`);
    return value;
  }
  return raw;
}

/** Renders a value for `config list`; sensitive values are masked. */
export function formatValue(def: ConfigKeyDef, value: string | number | boolean): string {
  const rendered = String(value);
  if (!def.sensitive) return rendered;
  return `${rendered.slice(0, 6)}…(hidden)`;
}
