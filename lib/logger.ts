import { sanitizeRaw } from '@/lib/redact';

export type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  requestId: string;
  event: string;
  mode?: string;
  adapter?: string;
  status?: number;
  code?: string;
  durationMs?: number;
  attempt?: number;
  metadata?: Record<string, unknown>;
}

export function logEvent(level: LogLevel, payload: LogPayload): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    requestId: payload.requestId,
    event: payload.event,
    mode: payload.mode,
    adapter: payload.adapter,
    status: payload.status,
    code: payload.code,
    durationMs: payload.durationMs,
    attempt: payload.attempt,
    metadata: payload.metadata ? sanitizeRaw(payload.metadata) : undefined,
  };

  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}
