import { SearchIcon, ShieldIcon, SparkIcon } from '@/components/icons';

export function EmptyState({ mode }: { mode: 'mock' | 'legacy-live' }) {
  return (
    <section className="empty-state" aria-label="Lookup instructions">
      <div className="empty-orbit" aria-hidden="true">
        <span />
        <span />
        <SearchIcon />
      </div>
      <div>
        <h2>One input. Two exact targets.</h2>
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
            <strong>{mode === 'mock' ? 'Safe mock mode' : 'Experimental legacy mode'}</strong>
            {mode === 'mock'
              ? 'No TikTok credentials or live requests required.'
              : 'Server-only signer bridge and device context required.'}
          </span>
        </div>
      </div>
    </section>
  );
}
