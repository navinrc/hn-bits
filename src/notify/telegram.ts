import { hnItemUrl } from '../api/firebase.js';
import type { Match, Notifier } from './notifier.js';

const SEND_TIMEOUT_MS = 10_000;

export class NotifyError extends Error {}

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

interface TelegramResponse {
  ok: boolean;
  parameters?: { retry_after?: number };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildMessage({ subscriptions, story }: Match): string {
  const names = subscriptions.map((s) => s.name).join(', ');
  const lines = [`🔔 <b>${escapeHtml(names)}</b>`];
  if (story.url) {
    lines.push(`<a href="${story.url}">${escapeHtml(story.title)}</a>`);
    lines.push(`${story.score} points · ${story.descendants} comments · by ${escapeHtml(story.by)}`);
    lines.push(`<a href="${hnItemUrl(story.id)}">HN discussion</a>`);
  } else {
    lines.push(`<a href="${hnItemUrl(story.id)}">${escapeHtml(story.title)}</a>`);
    lines.push(`${story.score} points · ${story.descendants} comments · by ${escapeHtml(story.by)}`);
  }
  return lines.join('\n');
}

async function post(config: TelegramConfig, text: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    return await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendMessage(config: TelegramConfig, text: string, retried = false): Promise<void> {
  const res = await post(config, text);
  const body = (await res.json().catch(() => null)) as TelegramResponse | null;
  if (res.ok && body?.ok) return;

  if (res.status === 429 && !retried) {
    const retryAfter = body?.parameters?.retry_after ?? 1;
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return sendMessage(config, text, true);
  }
  throw new NotifyError(`telegram sendMessage failed: ${res.status}`);
}

export function createTelegramNotifier(config: TelegramConfig): Notifier {
  return {
    name: 'telegram',
    send: (match) => sendMessage(config, buildMessage(match)),
  };
}
