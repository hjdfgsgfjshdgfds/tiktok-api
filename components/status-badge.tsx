import { AlertIcon, CheckIcon } from '@/components/icons';
import type { ValidationStatus } from '@/lib/types';

const labels: Record<ValidationStatus, string> = {
  validated: 'Exact target validated',
  partial: 'Validated · partial data',
  target_missing: 'Target missing',
  unsupported: 'Unsupported',
  failed: 'Validation failed',
};

export function StatusBadge({ status }: { status: ValidationStatus }) {
  const positive = status === 'validated';
  const partial = status === 'partial';
  return (
    <span
      className={`status-badge ${positive ? 'status-badge--good' : partial ? 'status-badge--partial' : 'status-badge--bad'}`}
    >
      {positive ? <CheckIcon /> : <AlertIcon />}
      {labels[status]}
    </span>
  );
}
