import { SearchIcon, ShieldIcon, SparkIcon } from '@/components/icons';
import type { LookupMode } from '@/lib/types';

export function EmptyState({ mode }: { mode: LookupMode }) {
  const modeLabel =
    mode === 'public-live'
      ? 'Public live mode'
      : mode === 'mock'
        ? 'Safe mock mode'
        : 'Experimental legacy mode';
  const modeDescription =
    mode === 'public-live'
      ? 'Real server-side TikTok page and fixed-host API requests. No TikTok login is required.'
      : mode === 'mock'
        ? 'Sanitized fixtures only; no TikTok network request is made.'
        : 'Server-only legacy signer bridge and device context required.';

  return (
    <section className="empty-state" aria-label="Lookup instructions">
      <div className="empty-orbit" aria-hidden="true">
        <span />
        <span />
        <SearchIcon />
      </div>
      <div>
        <h2>One input. One exact target.</h2>
        <p>
          Enter a username or user ID for a profile, or a direct video URL or Aweme ID for a post.
          Large IDs stay strings from request to response.
        </p>
      </div>
      <div className="empty-principles">
        <div>
          <ShieldIcon />
          <span>
            <strong>Exact identity</strong>
            Mismatched users and Awemes are rejected.
          </span>
        </div>
        <div>
          <SparkIcon />
          <span>
            <strong>{modeLabel}</strong>
            {modeDescription}
          </span>
        </div>
      </div>
    </section>
  );
}
