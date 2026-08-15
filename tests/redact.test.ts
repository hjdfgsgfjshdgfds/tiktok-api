import { describe, expect, it } from 'vitest';
import { containsSecretMarker, safePublicMediaUrl, sanitizeRaw, sanitizeUrl } from '@/lib/redact';

const id = '7399999999999999991';

describe('secret redaction', () => {
  it('redacts nested credentials and signer material', () => {
    const sanitized = sanitizeRaw({
      cookie: 'sessionid=real-secret',
      headers: { authorization: 'Bearer secret', 'x-bogus': 'signed-secret' },
      device_id: '123456789',
      sid_tt: 'sid-secret',
      auth_key: 'auth-secret',
      nested: { normal: id }
    });
    const text = JSON.stringify(sanitized);
    expect(text).not.toContain('real-secret');
    expect(text).not.toContain('signed-secret');
    expect(text).not.toContain('123456789');
    expect(text).not.toContain('sid-secret');
    expect(text).not.toContain('auth-secret');
    expect(text).toContain(id);
  });

  it('sanitizes signed URL parameters while preserving the exact Aweme ID', () => {
    const sanitized = sanitizeUrl(
      `https://v16.tiktokcdn.com/video/${id}.mp4?auth_key=fake-secret&msToken=fake-token&video_id=${id}`,
    );
    expect(sanitized).not.toContain('fake-secret');
    expect(sanitized).not.toContain('fake-token');
    expect(sanitized).toContain(id);
    expect(containsSecretMarker(sanitized)).toBe(true);
  });

  it('allows only local or known TikTok media hosts', () => {
    expect(safePublicMediaUrl('/mock-cover.svg')).toBe('/mock-cover.svg');
    expect(safePublicMediaUrl(`https://v16.tiktokcdn.com/video/${id}.mp4`)).toContain(id);
    expect(safePublicMediaUrl('https://example.com/tracker.png')).toBeUndefined();
    expect(safePublicMediaUrl('//example.com/tracker.png')).toBeUndefined();
    expect(safePublicMediaUrl(`http://v16.tiktokcdn.com/video/${id}.mp4`)).toBeUndefined();
  });
});
