interface WindowEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export class InMemoryRateLimiter {
  private readonly windows = new Map<string, WindowEntry>();
  private checks = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMilliseconds: number,
  ) {}

  check(key: string): RateLimitDecision {
    const now = Date.now();
    this.checks += 1;
    if (this.checks % 100 === 0) this.prune(now);

    const current = this.windows.get(key);
    if (!current || current.resetAt <= now) {
      const resetAt = now + this.windowMilliseconds;
      this.windows.set(key, { count: 1, resetAt });
      return { allowed: true, limit: this.limit, remaining: this.limit - 1, resetAt };
    }

    current.count += 1;
    return {
      allowed: current.count <= this.limit,
      limit: this.limit,
      remaining: Math.max(0, this.limit - current.count),
      resetAt: current.resetAt
    };
  }

  private prune(now: number): void {
    for (const [key, entry] of this.windows) {
      if (entry.resetAt <= now) this.windows.delete(key);
    }
  }
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return headers.get('x-real-ip')?.trim() || 'unknown';
}
