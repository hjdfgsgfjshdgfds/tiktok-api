import { CheckIcon, UserIcon } from '@/components/icons';
import { DataRow } from '@/components/data-row';
import { Metric } from '@/components/metric';
import { formatDateTime } from '@/lib/format';
import type { ProfileData } from '@/lib/types';

function BooleanLabel({ value }: { value: boolean | undefined }) {
  if (value === undefined) return null;
  return (
    <span className={value ? 'boolean-tag boolean-tag--yes' : 'boolean-tag'}>
      {value ? <CheckIcon /> : null}
      {value ? 'Yes' : 'No'}
    </span>
  );
}

export function ProfileResult({ data }: { data: ProfileData }) {
  const title = data.nickname ?? (data.username ? `@${data.username}` : 'Validated profile');

  return (
    <div className="animate-fade-up">
      <div className="entity-hero">
        <div className="entity-media entity-media--avatar">
          {data.avatar ? (
            // Upstream media is allowlisted and sanitized server-side.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.avatar}
              alt={data.nickname ? `${data.nickname} avatar` : 'Profile avatar'}
              referrerPolicy="no-referrer"
            />
          ) : (
            <UserIcon className="h-10 w-10 text-mist-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="entity-title">{title}</h2>
            {data.verified ? (
              <span className="verified-mark" title="Verified">
                <CheckIcon />
                <span className="sr-only">Verified</span>
              </span>
            ) : null}
            {data.privateAccount ? <span className="privacy-tag">Private</span> : null}
          </div>
          {data.nickname && data.username ? <p className="entity-handle">@{data.username}</p> : null}
          {data.signature ? <p className="entity-description">{data.signature}</p> : null}
        </div>
      </div>

      <dl className="metric-grid">
        <Metric label="Followers" value={data.followers} />
        <Metric label="Following" value={data.following} />
        <Metric label="Hearts" value={data.hearts} />
        <Metric label="Videos" value={data.videoCount} />
        <Metric label="Liked videos" value={data.favoritingCount} />
      </dl>

      <dl className="data-sheet">
        <DataRow label="Permanent user ID">
          <code className="id-value">{data.userId}</code>
        </DataRow>
        <DataRow label="Profile region">
          <span className="region-value">{data.region}</span>
        </DataRow>
        <DataRow label="Verified">
          <BooleanLabel value={data.verified} />
        </DataRow>
        <DataRow label="Private account">
          <BooleanLabel value={data.privateAccount} />
        </DataRow>
        <DataRow label="Account created (legacy field)">
          {data.accountCreatedAt ? formatDateTime(data.accountCreatedAt) : null}
        </DataRow>
      </dl>
    </div>
  );
}
