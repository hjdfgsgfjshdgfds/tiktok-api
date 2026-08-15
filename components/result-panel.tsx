import { ClockIcon } from '@/components/icons';
import { IssueList } from '@/components/issue-list';
import { PostResult } from '@/components/post-result';
import { ProfileResult } from '@/components/profile-result';
import { ProvenancePanel } from '@/components/provenance-panel';
import { RawJsonViewer } from '@/components/raw-json-viewer';
import { StatusBadge } from '@/components/status-badge';
import { formatDateTime } from '@/lib/format';
import type { LookupResult } from '@/lib/types';

export function ResultPanel({ result }: { result: LookupResult }) {
  if (!result.ok || !result.data) {
    return (
      <section className="result-shell result-shell--error animate-fade-up" aria-live="polite">
        <div className="result-heading">
          <div>
            <p className="section-label">Lookup stopped safely</p>
            <h2>No matching result was returned</h2>
          </div>
          <StatusBadge status={result.meta.validationStatus} />
        </div>
        <IssueList issues={result.errors} tone="error" />
        <IssueList issues={result.warnings} />
        {result.sources.length > 0 ? (
          <ProvenancePanel fields={result.fields} sources={result.sources} />
        ) : null}
        {result.raw !== undefined ? <RawJsonViewer raw={result.raw} /> : null}
      </section>
    );
  }

  return (
    <section className="result-shell" aria-live="polite">
      <div className="result-heading">
        <div>
          <p className="section-label">
            {result.entity.type === 'profile' ? 'Profile result' : 'Aweme result'}
          </p>
          <div className="result-meta-line">
            <ClockIcon />
            Retrieved {formatDateTime(result.retrievedAt)} · {result.meta.attemptCount} request
            {result.meta.attemptCount === 1 ? '' : 's'}
            {result.meta.cacheHit ? ' · cache hit' : ''}
          </div>
        </div>
        <StatusBadge status={result.meta.validationStatus} />
      </div>

      <IssueList issues={result.warnings} />

      {result.data.kind === 'profile' ? (
        <ProfileResult data={result.data} />
      ) : (
        <PostResult data={result.data} />
      )}

      <div className="result-disclosures">
        <ProvenancePanel fields={result.fields} sources={result.sources} />
        {result.raw !== undefined ? <RawJsonViewer raw={result.raw} /> : null}
      </div>
    </section>
  );
}
