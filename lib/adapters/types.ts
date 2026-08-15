import type { EndpointClient } from '@/lib/http/types';
import type {
  FieldProvenance,
  LookupData,
  LookupIssue,
  LookupMode,
  ParsedInput,
  ResultSource,
  ValidationStatus
} from '@/lib/types';

export interface AdapterContext {
  client: EndpointClient;
  mode: LookupMode;
  input: ParsedInput;
  includeRaw: boolean;
  retrievedAt: string;
  requestId: string;
  targetMissingRetries: number;
  signal: AbortSignal;
}

export interface AdapterOutcome {
  adapter: string;
  entityType: 'profile' | 'post' | 'story';
  data: LookupData;
  fields: FieldProvenance[];
  sources: ResultSource[];
  warnings: LookupIssue[];
  attemptCount: number;
  validationStatus: ValidationStatus;
  raw?: unknown;
}
