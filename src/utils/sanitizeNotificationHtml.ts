import sanitizeHtml from 'sanitize-html';

/**
 * Client-side defense in depth for notification bodies. The backend stores only
 * sanitized HTML; this pass removes anything that slipped through transport or
 * a compromised response before the content reaches dangerouslySetInnerHTML.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'div',
    'span',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'pre',
    'code',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'hr',
    'figure',
    'figcaption',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  // postcss-based style parsing is unreliable in browsers; drop styles here.
  parseStyleAttributes: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: 'a',
      attribs: { ...attribs, rel: 'noopener noreferrer' },
    }),
  },
};

export function sanitizeNotificationHtml(html: string | undefined): string {
  if (!html) return '';
  return sanitizeHtml(html, OPTIONS);
}
