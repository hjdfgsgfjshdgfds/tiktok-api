import { describe, expect, it } from 'vitest';
import { parseLookupInput } from '@/lib/input-parser';

function expectCode(callback: () => unknown, code: string) {
  try {
    callback();
    throw new Error('Expected callback to throw');
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

describe('parseLookupInput', () => {
  it('parses and normalizes a username', () => {
    expect(parseLookupInput('  @Example.Name  ')).toMatchObject({
      type: 'username',
      value: 'example.name',
      username: 'example.name',
    });
  });

  it('parses a TikTok profile URL', () => {
    expect(parseLookupInput('https://www.tiktok.com/@Example_Name/')).toMatchObject({
      type: 'username',
      username: 'example_name',
      canonicalUrl: 'https://www.tiktok.com/@example_name',
    });
  });

  it('parses a direct TikTok video URL', () => {
    const parsed = parseLookupInput(
      'https://www.tiktok.com/@Example/video/7399999999999999991?lang=en',
    );
    expect(parsed).toMatchObject({
      type: 'video_url',
      username: 'example',
      awemeId: '7399999999999999991',
      canonicalUrl: 'https://www.tiktok.com/@example/video/7399999999999999991',
    });
  });

  it('parses a legacy direct video URL', () => {
    expect(parseLookupInput('https://m.tiktok.com/v/7399999999999999991.html')).toMatchObject({
      type: 'video_url',
      awemeId: '7399999999999999991',
    });
  });

  it('preserves a 19-digit ID exactly as a string', () => {
    const parsed = parseLookupInput('7399999999999999991');
    expect(parsed.value).toBe('7399999999999999991');
    expect(typeof parsed.value).toBe('string');
    expect(parsed.type).toBe('aweme_id');
    expect(parsed.numericAmbiguous).toBe(true);
  });

  it('supports explicit 19-digit user IDs without ambiguity', () => {
    expect(parseLookupInput('user:6800000000000000001')).toEqual({
      original: 'user:6800000000000000001',
      type: 'user_id',
      value: '6800000000000000001',
      userId: '6800000000000000001',
    });
  });

  it('supports explicit Aweme IDs', () => {
    expect(parseLookupInput('aweme:7399999999999999991')).toMatchObject({
      type: 'aweme_id',
      awemeId: '7399999999999999991',
    });
  });

  it('treats shorter bare numeric IDs as user IDs first', () => {
    expect(parseLookupInput('123456789012345678')).toMatchObject({
      type: 'user_id',
      userId: '123456789012345678',
      numericAmbiguous: true,
    });
  });

  it('rejects unsupported domains', () => {
    expectCode(
      () => parseLookupInput('https://example.com/@name/video/7399999999999999991'),
      'unsupported_input',
    );
  });

  it('rejects short links rather than following arbitrary redirects', () => {
    expectCode(() => parseLookupInput('https://vm.tiktok.com/ZM123abc/'), 'unsupported_input');
  });

  it('rejects TikTok URLs containing embedded credentials', () => {
    expectCode(
      () => parseLookupInput('https://user:password@www.tiktok.com/@example'),
      'invalid_input',
    );
  });

  it('rejects malformed URL escape sequences without leaking a URIError', () => {
    expectCode(() => parseLookupInput('https://www.tiktok.com/@bad%ZZ'), 'invalid_input');
  });

  it('rejects command-like input', () => {
    expectCode(() => parseLookupInput('name; rm -rf /'), 'invalid_input');
  });
});
