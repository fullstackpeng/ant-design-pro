import { describe, expect, it } from 'vitest';
import { sanitizeNotificationHtml } from './sanitizeNotificationHtml';

describe('sanitizeNotificationHtml', () => {
  it('drops scripts, event handlers, unsafe URLs and inline styles', () => {
    const html =
      '<p onclick="alert(1)" style="background:url(javascript:alert(2))">正文' +
      '<script>alert(3)</script></p>' +
      '<a href="javascript:alert(4)" target="_blank">链接</a>' +
      '<img src="/api/notification-assets/1" alt="图片">';

    const clean = sanitizeNotificationHtml(html);

    expect(clean).toContain('正文');
    expect(clean).toContain('/api/notification-assets/1');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('javascript:');
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('style=');
    expect(clean).toContain('rel="noopener noreferrer"');
  });
});
