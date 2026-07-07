const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&gt;': '>',
  '&lt;': '<',
  '&quot;': '"',
  "&#x27;": "'",
  '&#x2F;': '/',
};

function decodeEntities(text: string): string {
  return text.replace(/&amp;|&gt;|&lt;|&quot;|&#x27;|&#x2F;/g, (match) => ENTITIES[match]);
}

function extractCodeBlocks(html: string): string {
  return html.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, (_match, code: string) =>
    code
      .split('\n')
      .map((line) => `    ${line}`)
      .join('\n'),
  );
}

function extractAnchors(html: string): string {
  return html.replace(/<a\s+href="([^"]*)"[^>]*>.*?<\/a>/gi, '$1');
}

function stripTags(html: string): string {
  return html.replace(/<\/?i>/gi, '').replace(/<p>/gi, '\n\n').replace(/<[^>]+>/g, '');
}

function prefixQuotedLines(text: string): string {
  return text
    .split('\n')
    .map((line) => (line.startsWith('>') ? `│ ${line.slice(1).trim()}` : line))
    .join('\n');
}

/** Renders HN comment HTML as plain text. Dumb and total — never throws. */
export function htmlToText(html: string): string {
  const withCode = extractCodeBlocks(html);
  const withUrls = extractAnchors(withCode);
  const stripped = stripTags(withUrls);
  const decoded = decodeEntities(stripped);
  return prefixQuotedLines(decoded).replace(/^\n+|\n+$/g, '');
}
