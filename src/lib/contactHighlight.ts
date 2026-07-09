export interface TextToken {
  text: string;
  kind?: 'link' | 'email';
}

// Wrapped lines have no internal newlines and rarely straddle a URL/email boundary;
// when they do, only the head of the match (up to the wrap point) gets colored.
const CONTACT_PATTERN = /(https?:\/\/\S+)|([\w.+-]+@[\w-]+\.[\w.-]+)/g;

/** Splits a single line of already-wrapped text into plain/link/email tokens. */
export function tokenizeContacts(line: string): TextToken[] {
  const tokens: TextToken[] = [];
  let lastIndex = 0;
  for (const match of line.matchAll(CONTACT_PATTERN)) {
    const index = match.index;
    if (index > lastIndex) tokens.push({ text: line.slice(lastIndex, index) });
    tokens.push({ text: match[0], kind: match[1] ? 'link' : 'email' });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < line.length) tokens.push({ text: line.slice(lastIndex) });
  return tokens.length > 0 ? tokens : [{ text: line }];
}
