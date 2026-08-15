import { describe, expect, it } from 'vitest';
import { compactFields, createField } from '@/lib/provenance';

describe('field provenance', () => {
  it('retains the display label, exact upstream path, source, timestamp, and origin', () => {
    const field = createField({
      label: 'Permanent user ID',
      value: '6800000000000000001',
      sourceEndpoint: 'GET mock.local/aweme/v1/user/',
      upstreamPath: 'user.uid',
      retrievedAt: '2026-08-15T12:00:00.000Z',
    });
    expect(field).toMatchObject({
      label: 'Permanent user ID',
      value: '6800000000000000001',
      sourceEndpoint: 'GET mock.local/aweme/v1/user/',
      upstreamPath: 'user.uid',
      retrievedAt: '2026-08-15T12:00:00.000Z',
      confidence: 'high',
      status: 'direct',
      origin: 'mock',
    });
    expect(field?.id).toHaveLength(16);
  });

  it('omits unavailable fields rather than generating placeholders', () => {
    expect(
      compactFields([
        createField({
          label: 'secUid',
          value: undefined,
          sourceEndpoint: 'mock',
          upstreamPath: 'user.sec_uid',
          retrievedAt: '2026-08-15T12:00:00.000Z',
        }),
      ]),
    ).toEqual([]);
  });

  it('uses TikTok origin for non-mock direct upstream fields', () => {
    const field = createField({
      label: 'Post / Aweme ID',
      value: '7399999999999999991',
      sourceEndpoint: 'GET api2.musical.ly/aweme/v1/aweme/detail/',
      upstreamPath: 'aweme_detail.aweme_id',
      retrievedAt: '2026-08-15T12:00:00.000Z',
    });

    expect(field?.origin).toBe('tiktok');
  });
});
