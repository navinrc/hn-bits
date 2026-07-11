# Config file (`src/lib/config.ts`)

First persistent artifact in the app. Exists **only** to configure AI; V1 features never read it.

## Location

1. `$HN_BITS_CONFIG` if set (absolute path to a JSON file).
2. Else `~/.config/hn-bits/config.json` (XDG-ish, hardcoded — no `XDG_CONFIG_HOME` handling in V2; note as later nicety).

V2 shipped with no `hn config` subcommand — user edited the file directly; README/setup hint showed the snippet to paste. **Superseded in V2.5** ([../v2.5/01-config-cli.md](../v2.5/01-config-cli.md)): `hn config get/set/unset/list` now manages this file, needed once telegram/desktop keys arrive in V3.

## Schema

```json
{
  "ollama": {
    "host": "http://localhost:11434",
    "model": "llama3.2"
  }
}
```

```ts
interface Config {
  ollama: {
    host: string;   // default "http://localhost:11434"
    model: string;  // default "llama3.2"
  };
}

loadConfig(): Config | null   // null = no file
```

## Behavior

| Situation | Behavior |
|-----------|----------|
| File absent | `loadConfig()` returns `null`. App runs; `s`/`a` show setup hint (below) instead of invoking AI |
| File present, field missing | Field takes default above (deep-merge with defaults) |
| File present, invalid JSON | Startup **warning line** (`config invalid: <parse error> — AI disabled`), then treated as absent. Never crash the reader over AI config |
| Extra unknown keys | Ignored silently (forward compat with V3 keys) |

Setup hint (rendered in the panel area when `s`/`a` pressed with no config):

```text
 AI not configured.
 1. Install Ollama and pull a model:  ollama pull llama3.2
 2. Create ~/.config/hn-bits/config.json:
    { "ollama": { "host": "http://localhost:11434", "model": "llama3.2" } }
 esc close
```

## Loading

- Read once at startup (synchronous `readFileSync` fine — happens before first render), passed down via prop/context. No hot reload; restart to pick up changes.
- V3 extends this same file with `telegram`, `subscriptions` defaults etc. — schema is additive, `Config` type grows per version.
