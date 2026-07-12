# Merge multi-subscription matches into one notification per story

A story matching several subscriptions in a single `hn watch` run currently fires one notification
per subscription (Telegram message and desktop popup each time). Observed live: story `48883275`
("Claude Code sends 33k tokens before reading the prompt; OpenCode sends 7k") matched sub 1
`Claude Code` (title) and sub 2 `Anthropic` (Algolia full-text on URL/story text), producing two
identical-looking messages seconds apart. `seen_items` rows confirm the pattern repeats
(`48882495`, `48881689` across the OpenAI and Apple subs).

Root cause: dedup is keyed `(story_id, subscription_id)` (`src/db/db.ts`) and `runWatch`
(`src/watch.ts`) processes each subscription independently, so nothing merges a story shared by
multiple subscriptions within a run.

Decision: merge into ONE notification per story per run. Header lists all matching subscription
names, e.g. `🔔 Claude Code, Anthropic`. Per-subscription `seen_items` rows stay; no schema change.

Prerequisites: V3 watcher, V3.5 desktop notifications.

## Design

* `Match.subscription` becomes `subscriptions: Subscription[]` (non-empty, subscription order).
  Array rather than a precomputed label: Telegram must `escapeHtml` names, desktop must not, so
  each notifier joins names itself.
* Watch run becomes two phases:
  * Phase A, collect: per-sub fetch plus unseen filter, accumulating
    `Map<storyId, { story, subscriptions[] }>`.
  * Phase B, dispatch: one notify per story, sorted by `story.time` ascending (generalizes the
    current per-sub oldest-first order). On success, `markSeen` for every matching sub. On failure,
    mark none and set `hadFailure`.
* `touchLastRun` semantics preserved: per sub, iff its fetch succeeded and not dry-run, even when a
  later send fails (existing contract in `watch.test.ts`).
* Desktop `--group` changes from `hn-${sub.id}-${story.id}` to `hn-${story.id}`: notification
  identity is now per-story.
* Cross-run edge is out of scope by design: if sub B matches the same story in a later run, B fires
  alone with only B's name, since per-sub seen rows remain the dedup unit.
* Thresholds need no work: `minPoints`/`minComments` apply per-sub at Algolia fetch time, so a
  merged story already passed every listed sub's thresholds.

## Changes

1. `src/notify/notifier.ts`: `Match.subscriptions: Subscription[]`.
2. `src/notify/telegram.ts` `buildMessage`: header
   `🔔 <b>${escapeHtml(subscriptions.map(s => s.name).join(', '))}</b>`. Rest unchanged.
3. `src/notify/desktop.ts` `wrapperArguments`: title joins names; group `hn-${story.id}`.
4. `src/watch.ts`: restructure into small functions (about 10 lines each):
   * `fetchMatches(sub, now)`: try/catch `searchRecent` plus `!isSeen` filter; `null` on query
     failure; per-sub sort dropped (moves to dispatch).
   * `collectPending(subs, now)`: phase A; returns `{ pending, fetchedSubs, failedSubs }`.
   * `notifyStory(subs, story, notifiers)`: sends `{ subscriptions, story }`; failure log uses
     joined names.
   * `dispatchPending(pending, notifiers, now, dryRun)`: phase B; dry-run logs
     `would notify: [${names}] ${title} (${score} pts)` (single-sub output identical to today).
   * `runWatch`: wires phases; `touchLastRun` for fetched subs after dispatch; exit 1 if
     `failedSubs > 0` or `hadFailure` (existing semantics).

## Tests

* `src/watch.test.ts`: update send expectations from `{ subscription: sub }` to
  `{ subscriptions: [sub] }`.
  * Regression: two subs return the same story; exactly one Telegram and one desktop call with
    `subscriptions: [subA, subB]`; `markSeen` for both `(id, 1)` and `(id, 2)`; `touchLastRun`
    both; exit 0.
  * Failure: same setup, send rejects; `markSeen` never called; exit 1; `touchLastRun` still both.
  * Ordering: two distinct stories with inverted `time`; sends are time-ascending.
* `src/notify/telegram.test.ts`: literals updated; new two-sub header test with `<` in a name to
  cover escaping of the joined label.
* `src/notify/desktop.test.ts`: literals updated; group expectation becomes `hn-<storyId>`; new
  two-sub title test.
* `src/db/seen.test.ts`: unchanged (per-sub scoping is still the contract).
* Per regression-test rule: temp-revert the `watch.ts` fix, confirm the multi-sub test fails with
  two sends, then re-apply.

## Verification

1. Full suite passes.
2. `hn watch --once --dry-run`: a story matching multiple subs logs one
   `would notify: [Sub1, Sub2] ...` line.
