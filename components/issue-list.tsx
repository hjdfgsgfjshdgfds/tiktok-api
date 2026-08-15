import { AlertIcon } from '@/components/icons';
import type { LookupIssue } from '@/lib/types';

export function IssueList({
  issues,
  tone = 'warning',
}: {
  issues: LookupIssue[];
  tone?: 'warning' | 'error';
}) {
  if (issues.length === 0) return null;

  return (
    <div className={`issue-list issue-list--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <AlertIcon className="mt-0.5 shrink-0" />
      <div className="min-w-0 space-y-2">
        {issues.map((issue) => (
          <div key={`${issue.code}:${issue.message}`}>
            <p className="font-medium text-current">{issue.message}</p>
            {issue.detail ? <p className="mt-0.5 text-sm opacity-70">{issue.detail}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
