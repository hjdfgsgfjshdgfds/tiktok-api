import { formatCompactNumber } from '@/lib/format';

export function Metric({ label, value }: { label: string; value: number | undefined }) {
  if (value === undefined) return null;
  return (
    <div className="metric">
      <dt>{label}</dt>
      <dd title={new Intl.NumberFormat('en').format(value)}>{formatCompactNumber(value)}</dd>
    </div>
  );
}
