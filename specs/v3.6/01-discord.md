# Discord notifications (`src/notify/discord.ts`)

Third `Notifier` implementation ([../v3/04-notifications.md](../v3/04-notifications.md)): watcher matches delivered to a Discord channel. **Webhook transport**, not a bot: a channel webhook URL is one POST with zero bot registration, token scopes, or gateway ceremony. Right fit for a personal one-way notification stream.

Prerequisites: V3 complete (Notifier interface, watcher). V3.5 not required; notifiers are independent.

## Config

New keys in `CONFIG_KEYS` (`src/lib/configKeys.ts`), additive:

```bash
hn config set discord.enabled true
hn config set discord.webhookUrl https://discord.com/api/webhooks/<id>/<token>
```

- `discord.webhookUrl` is `sensitive` (masked by `hn config get/list`, like `telegram.botToken`).
- Activation: `discord.enabled === true` with `webhookUrl` set. Independent of the other notifiers; joins the watcher's "no notifier enabled = exit 2" set.
- Setup (documented in README): channel settings, Integrations, Webhooks, New Webhook, copy URL.

## Implementation (`discord.ts`)

One call per match:

```text
POST <webhookUrl>
```

```json
{
  "content": "🔔 **postgres**\n[Postgres 18 released](https://example.com/article)\n312 points · 214 comments · by someauthor\n[HN discussion](https://news.ycombinator.com/item?id=41211001)"
}
```

- Same content rules as telegram ([../v3/04-notifications.md](../v3/04-notifications.md)): story link omitted for text posts (HN link only, becomes the title link); markdown instead of HTML; title/author markdown-escaped.
- Discord webhooks return `204 No Content` on success; `200` with body when `?wait=true` is used. Plain POST, no `wait` needed.

## Failure handling

Telegram's semantics exactly:

- One 429 retry honoring Discord's `retry_after` (JSON body, seconds); anything else throws `NotifyError`: logged by the watcher, **not** marked seen, retried next run. At-least-once delivery.
- 10 s request timeout, sequential sends (watcher already serial) stay far under webhook rate limits (~5 req/2 s per webhook).
