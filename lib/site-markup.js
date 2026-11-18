import fs from 'node:fs';
import path from 'node:path';
import parse from 'html-react-parser';

const contentDirectory = path.join(process.cwd(), 'content');

// Server-only rendering preserves every source element and class without
// inserting wrapper elements or replacing the existing media pipeline.
export function readMarkup(name) {
  if (!/^[a-z-]+$/.test(name)) throw new Error('Invalid content fragment');
  return fs.readFileSync(path.join(contentDirectory, `${name}.html`), 'utf8');
}

export function renderMarkup(name) {
  // Match the browser's HTML newline normalization. Head whitespace is not
  // rendered, and React correctly requires it to be omitted from <head>.
  return parse(readMarkup(name).replace(/\r\n?/g, '\n'), {
    trim: name === 'head',
    replace(node) {
      // Hidden modal placeholders receive their source when opened. React
      // intentionally omits an empty src rather than requesting the page.
      if (node.name === 'img' && node.attribs?.src === '') delete node.attribs.src;
    },
  });
}
