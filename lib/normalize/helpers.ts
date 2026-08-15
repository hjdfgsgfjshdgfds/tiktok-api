import { safePublicMediaUrl } from '@/lib/redact';
import { isRecord } from '@/lib/utils';

export function mediaUrls(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.url_list)) return [];
  return [
    ...new Set(value.url_list.map(safePublicMediaUrl).filter((url): url is string => Boolean(url))),
  ];
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
