import type { Story } from '../api/firebase.js';
import type { Subscription } from '../db/subscriptions.js';

export interface Match {
  subscription: Subscription;
  story: Story;
}

export interface Notifier {
  name: string;
  /** Throws on failure; the watcher decides retry semantics (no markSeen on throw). */
  send(match: Match): Promise<void>;
}
