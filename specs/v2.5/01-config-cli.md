# Config CLI (`hn config` — `src/lib/configKeys.ts` + `src/lib/configStore.ts`)

Small slice between V2 (config file, read-only) and V3 (subscriptions/watcher/notifications need `telegram`/`desktopNotifications` set). Hand-editing nested JSON for a bot token is worse than a few `get`/`set` commands, so this ships now rather than waiting on the rest of V3.

Supersedes `specs/v2/01-config.md`'s "No `hn config` subcommand" decision.

## Schema

Whitelisted keys (no free-form dotted-path reflection — the schema is small and fixed):

| Key | Type | Notes |
|-----|------|-------|
| `ollama.host` | string | default `http://localhost:11434` |
| `ollama.model` | string | default `llama3.2` |
| `telegram.enabled` | boolean | explicit flag, mirrors `desktopNotifications.enabled` |
| `telegram.botToken` | string | sensitive — masked in `list` output |
| `telegram.chatId` | string | |
| `desktopNotifications.enabled` | boolean | |
| `desktopNotifications.timeoutSeconds` | number | default `10` when section present |

`Config` interface (`src/lib/config.ts`) grows:

```ts
interface Config {
  ollama: { host: string; model: string };
  telegram?: { enabled: boolean; botToken?: string; chatId?: string };
  desktopNotifications?: { enabled: boolean; timeoutSeconds: number };
}
```

`telegram`/`desktopNotifications` have no fabricated values when absent — `loadConfig()` passes them through raw (only `desktopNotifications.timeoutSeconds` gets a default, and only when the section exists).

## Commands

```bash
hn config list                  # every known key, current value ((not set) if absent)
hn config get <key>             # single value, raw (unmasked) — scriptable
hn config set <key> <value>     # validates key + coerces value to its type, writes file
hn config unset <key>           # removes a leaf; prunes the section if it becomes empty
```

Unknown key or a value that fails type coercion (e.g. `set desktopNotifications.enabled maybe`) → stderr message, exit 1. Missing positional args → Commander's own usage error, exit 1.

`list` masks `sensitive` keys (`telegram.botToken` → `123456:AB…(hidden)`); `get` does not mask — it's meant to be piped into other tools/scripts.

## Storage behavior

- Config file location unchanged from V2: `$HN_BITS_CONFIG` or `~/.config/hn-bits/config.json`.
- `set`/`unset` read the file's raw JSON (not merged with defaults), mutate just the touched leaf, and write back — so the file only ever contains what the user actually set, never fabricated defaults.
- First `set` when no file/directory exists creates both (`mkdir -p` equivalent, then write).
- File is pretty-printed (`JSON.stringify(obj, null, 2)`), trailing newline.

## Interaction with V3 notifications

`specs/v3/04-notifications.md` is updated alongside this spec: Telegram activation is `telegram.enabled === true` (with `botToken`/`chatId` required when enabled), not bare section presence — symmetric with how `desktopNotifications.enabled` already worked. Setup path for both notifiers becomes `hn config set ...`, not hand-editing JSON.

## Out of scope

No interactive wizard, no `hn config edit` (open in `$EDITOR`), no config validation beyond per-key type coercion (e.g. not checking that `telegram.botToken` looks like a real token) — those are all easy to add later without touching this schema.
