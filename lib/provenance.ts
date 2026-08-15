import { createHash } from 'node:crypto';
import type { FieldProvenance } from '@/lib/types';

interface FieldOptions {
  label: string;
  value: unknown;
  sourceEndpoint: string;
  upstreamPath: string;
  retrievedAt: string;
  confidence?: FieldProvenance['confidence'];
  status?: FieldProvenance['status'];
  explanation?: string;
  origin?: FieldProvenance['origin'];
}

export function createField(options: FieldOptions): FieldProvenance | null {
  if (options.value === undefined || options.value === null || options.value === '') {
    return null;
  }

  const id = createHash('sha256')
    .update(`${options.sourceEndpoint}:${options.upstreamPath}:${options.label}`)
    .digest('hex')
    .slice(0, 16);

  return {
    id,
    label: options.label,
    value: options.value,
    sourceEndpoint: options.sourceEndpoint,
    upstreamPath: options.upstreamPath,
    retrievedAt: options.retrievedAt,
    confidence: options.confidence ?? 'high',
    status: options.status ?? 'direct',
    explanation: options.explanation,
    origin: options.origin ?? (options.sourceEndpoint.includes('mock.local') ? 'mock' : 'tiktok')
  };
}

export function compactFields(fields: Array<FieldProvenance | null>): FieldProvenance[] {
  return fields.filter((field): field is FieldProvenance => field !== null);
}
