import { describe, expect, it } from 'vitest';
import { htmlToText } from './html.js';

describe('htmlToText', () => {
  it('turns <p> into a paragraph break', () => {
    expect(htmlToText('<p>A</p><p>B</p>')).toBe('A\n\nB');
  });

  it('strips italics tags but keeps the text', () => {
    expect(htmlToText('<i>hello</i>')).toBe('hello');
  });

  it('replaces an anchor with its URL', () => {
    expect(htmlToText('<a href="https://x.com">click here</a>')).toBe('https://x.com');
  });

  it('indents a code block and preserves line breaks', () => {
    expect(htmlToText('<pre><code>const x = 1;\nlog(x);</code></pre>')).toBe(
      '    const x = 1;\n    log(x);',
    );
  });

  it('prefixes HN-quote lines with │', () => {
    expect(htmlToText('&gt; some quote')).toBe('│ some quote');
  });

  it('decodes entities', () => {
    expect(htmlToText('&amp; &lt; &quot; &#x27; &#x2F;')).toBe('& < " \' /');
  });

  it('strips unknown tags', () => {
    expect(htmlToText('<b>bold</b> text')).toBe('bold text');
  });

  it('never throws on malformed input', () => {
    expect(() => htmlToText('<div unclosed')).not.toThrow();
  });
});
