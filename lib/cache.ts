import type { LookupExecution } from '@/lib/types';

interface CacheEntry {
  value: LookupExecution;
  expiresAt: number;
  touchedAt: number;
}

export class LookupCache {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(
    private readonly ttlMilliseconds: number,
    private readonly maximumEntries: number,
  ) {}

  get(key: string): LookupExecution | undefined {
    if (this.ttlMilliseconds <= 0) return undefined;

    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }

    entry.touchedAt = Date.now();
    const copy = structuredClone(entry.value);
    copy.result.meta.cacheHit = true;
    return copy;
  }

  set(key: string, value: LookupExecution): void {
    if (this.ttlMilliseconds <= 0 || !value.result.ok) return;

    const now = Date.now();
    this.entries.set(key, {
      value: structuredClone(value),
      expiresAt: now + this.ttlMilliseconds,
      touchedAt: now
    });

    if (this.entries.size > this.maximumEntries) {
      const oldest = [...this.entries.entries()].sort(
        ([, left], [, right]) => left.touchedAt - right.touchedAt,
      )[0];
      if (oldest) this.entries.delete(oldest[0]);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
