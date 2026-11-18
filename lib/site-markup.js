import fs from 'node:fs';
import path from 'node:path';
import parse from 'html-react-parser';

const contentDirectory = path.join(process.cwd(), 'content');

function renderBrandLogo(placement) {
  if (!['header', 'footer'].includes(placement)) throw new Error('Invalid logo placement');
  // Render the supplied vector directly. Separate IDs keep its gradients and
  // artwork independent when the same SVG appears twice on the page.
  const source = fs.readFileSync(path.join(process.cwd(), 'public', 'logo-brand-lockup-light.svg'), 'utf8')
    .replace(/id="typography-group"/, 'id="typography-group" data-logo-typography=""')
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="rivanta-${placement}-${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#rivanta-${placement}-${id})`);
  return parse(source, {
    trim: true,
    replace(node) {
      if (node.name === 'svg') Object.assign(node.attribs, {
        class: `rivanta-brand-logo rivanta-${placement}-logo`,
        width: placement === 'header' ? '246' : '360',
        height: placement === 'header' ? '59.2222' : '86.6667',
        role: 'img', 'aria-label': 'Rivanta', focusable: 'false',
      });
    },
  });
}

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
      if (node.name === 'img' && node.attribs?.['data-brand-logo']) {
        return renderBrandLogo(node.attribs['data-brand-logo']);
      }
      // Hidden modal placeholders receive their source when opened. React
      // intentionally omits an empty src rather than requesting the page.
      if (node.name === 'img' && node.attribs?.src === '') delete node.attribs.src;
    },
  });
}
