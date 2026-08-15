import { describe, expect, it } from 'vitest';
import { InMemoryRateLimiter } from '@/lib/rate-limit';

describe('in-memory IP rate limiter', () => {
  it('allows a bounded number of requests per window', () => {
    const limiter = new InMemoryRateLimiter(2, 60_000);
    expect(limiter.check('127.0.0.1')).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.check('127.0.0.1')).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.check('127.0.0.1')).toMatchObject({ allowed: false, remaining: 0 });
  });
});
