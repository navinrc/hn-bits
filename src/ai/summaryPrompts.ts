import type { CommentNode } from '../api/algolia.js';
import { fetchComments } from '../api/algolia.js';
import type { Story } from '../api/firebase.js';
import { ExtractionError, extractArticle } from '../lib/article.js';
import { htmlToText } from '../lib/html.js';
import { buildThreadContext, type PromptResult } from './context.js';

function buildArticlePrompt(title: string, articleText: string): string {
  return `Summarize this article in 3-5 sentences, then list 2-3 key takeaways as short dashes.\n\nTitle: ${title}\n\n${articleText}`;
}

function buildThreadPrompt(title: string, threadText: string): string {
  return `Summarize this Hacker News discussion: main viewpoints, notable disagreements, and any strong consensus. 4-6 sentences.\n\nStory: ${title}\n\nComments:\n${threadText}`;
}

function threadNotice(thread: ReturnType<typeof buildThreadContext>): string | undefined {
  return thread.trimmed ? `thread trimmed to first ${thread.includedTopLevel} comments` : undefined;
}

async function fallbackPrompt(story: Story, extractionNoticePrefix?: string): Promise<PromptResult> {
  if (story.text) {
    const notice = extractionNoticePrefix ? `${extractionNoticePrefix} — summarizing post text instead` : undefined;
    return { prompt: buildArticlePrompt(story.title, htmlToText(story.text)), notice };
  }

  const comments = await fetchComments(story.id);
  const thread = buildThreadContext(comments);
  const notice = [
    extractionNoticePrefix ? `${extractionNoticePrefix} — summarizing thread instead` : undefined,
    threadNotice(thread),
  ]
    .filter(Boolean)
    .join('; ');
  return { prompt: buildThreadPrompt(story.title, thread.text), notice: notice || undefined };
}

/** Story-list `s`: article summary, falling back to post text then thread on extraction failure. */
export async function buildListSummaryPrompt(story: Story, signal: AbortSignal): Promise<PromptResult> {
  if (!story.url) return fallbackPrompt(story);

  try {
    const article = await extractArticle(story.url, signal);
    return {
      prompt: buildArticlePrompt(story.title, article.text),
      notice: article.truncated ? 'article truncated to 16k chars' : undefined,
    };
  } catch (err) {
    const reason = err instanceof ExtractionError ? err.reason : 'unknown';
    return fallbackPrompt(story, `article unavailable (${reason})`);
  }
}

/** Comments view `s`: thread summary from the already-loaded comment tree. */
export function buildCommentsSummaryPrompt(story: Story, comments: CommentNode[]): PromptResult {
  const thread = buildThreadContext(comments);
  return { prompt: buildThreadPrompt(story.title, thread.text), notice: threadNotice(thread) };
}
