import type { CommentNode } from '../api/algolia.js';
import type { Story } from '../api/firebase.js';
import { htmlToText } from '../lib/html.js';

const THREAD_CHAR_BUDGET = 12_000;
const COMMENT_CHAR_CAP = 1_000;
const MAX_REPLY_DEPTH = 2;

export interface PromptResult {
  prompt: string;
  notice?: string;
}

export interface ThreadContext {
  text: string;
  includedTopLevel: number;
  trimmed: boolean;
}

function capCommentText(html: string): string {
  const plain = htmlToText(html);
  return plain.length > COMMENT_CHAR_CAP ? `${plain.slice(0, COMMENT_CHAR_CAP)}…` : plain;
}

function renderNode(node: CommentNode, depth: number, lines: string[]): void {
  lines.push(`${'  '.repeat(depth)}${node.author}: ${capCommentText(node.text)}`);
  if (depth < MAX_REPLY_DEPTH) {
    for (const child of node.children) renderNode(child, depth + 1, lines);
  }
}

/** Walks top-level comments in API order, trimming to a char budget once at least one is included. */
export function buildThreadContext(comments: CommentNode[]): ThreadContext {
  const lines: string[] = [];
  let includedTopLevel = 0;
  let trimmed = false;

  for (const top of comments) {
    const candidate: string[] = [];
    renderNode(top, 0, candidate);
    const projectedLength = lines.join('\n').length + candidate.join('\n').length;
    if (projectedLength > THREAD_CHAR_BUDGET && includedTopLevel > 0) {
      trimmed = true;
      break;
    }
    lines.push(...candidate);
    includedTopLevel++;
  }

  return { text: lines.join('\n'), includedTopLevel, trimmed };
}

export interface AskAIContextInput {
  story: Story;
  article: { text: string } | null;
  articleUnavailableReason?: string;
  comments: CommentNode[] | null;
}

/** Assembles the Ask AI system prompt: story metadata + article text + trimmed discussion. */
export function buildAskAIContext({ story, article, articleUnavailableReason, comments }: AskAIContextInput): string {
  const articleSection = article ? article.text : `unavailable: ${articleUnavailableReason ?? 'no article'}`;
  const discussionSection = comments ? buildThreadContext(comments).text : 'not loaded';

  return [
    'You are answering questions about a Hacker News story and its discussion.',
    "Base answers only on the provided material; say so when it doesn't contain the answer.",
    '',
    `Story: ${story.title} (${story.url ?? 'text post'}) — ${story.score} points, ${story.descendants} comments`,
    '',
    'Article:',
    articleSection,
    '',
    'Discussion:',
    discussionSection,
  ].join('\n');
}
