# Desktop notifications (`src/notify/desktop.ts`)

Second `Notifier` implementation ([../v3/04-notifications.md](../v3/04-notifications.md)): macOS desktop notifications for watcher matches, alongside V3's Telegram. Extracted from V3 so the radar core (subscriptions + watcher + Telegram) ships without a macOS-only external binary in scope.

Prerequisites: V3 complete (Notifier interface, watcher). Config keys already exist in code since V2.5.

## Dependency

| Package | Why |
|---------|-----|
| `alerter` *(external binary, `brew install vjeantet/tap/alerter`, macOS-only, not npm)* | desktop notifications with click-result output; spawned as child process |

macOS-only via [alerter](https://github.com/vjeantet/alerter). Requires macOS 13+; some alerter features use private APIs and may break on future macOS releases. Stick to the stable subset (no reply/dropdown actions; click-to-open is in).

## Config

Keys shipped in V2.5 (`src/lib/configKeys.ts`), activated here:

```bash
hn config set desktopNotifications.enabled true
hn config set desktopNotifications.timeoutSeconds 10   # optional, default 10
```

`desktopNotifications.enabled === true` turns the notifier on. Independent of telegram: either enabled alone is valid.

## Implementation (`desktop.ts`)

- **Binary discovery:** `alerter` looked up on `PATH` once per watcher run. Missing = one stderr warning `desktop: alerter not found (brew install vjeantet/tap/alerter), skipping` and the notifier is disabled for the run. Never exit 2; telegram unaffected.
- **Invocation:** alerter has no `-open` flag and blocks until the notification is clicked, dismissed, or times out, printing the result. So `send()` spawns a detached `sh -c` wrapper (stdio ignored, `unref()`):

```sh
r=$(alerter -title "🔔 <sub name>" -subtitle "<points> pts · <comments> comments" \
    -message "<story title>" -actions Open -timeout <timeoutSeconds> -group hn-<subId>)
case "$r" in @TIMEOUT|@CLOSED) ;; *) open "<url>" ;; esac
```

- **Click opens the story URL** (HN discussion link for text posts, same rule as the telegram message). Body click (`@CONTENTCLICKED`) and the `Open` action both open. Title and URL shell-escaped.
- **Fire-and-forget:** `send()` resolves once the wrapper spawns; the wrapper, not the watcher, waits out the interaction, lives at most `timeoutSeconds`, and exits with the notification. Watcher exit is never delayed.
- `-group hn-<subId>` replaces a subscription's stale notification instead of stacking.

## Watcher deltas ([../v3/03-watcher.md](../v3/03-watcher.md))

- **Exit-2 gate widens:** V3's "telegram not enabled" becomes "no notifier enabled at all"; desktop alone is a valid configuration.
- **Best-effort (deliberate asymmetry):** desktop spawn failures are logged, never throw `NotifyError`, never block `markSeen`. Telegram remains the at-least-once channel.
- **Desktop-only config caveat:** a spawned wrapper counts as sent, so delivery is at-most-once. Accepted.
- New log line, in place per the discovery rule above:

```text
[2026-07-07T10:30:01Z] desktop: alerter not found (brew install vjeantet/tap/alerter), skipping
```
