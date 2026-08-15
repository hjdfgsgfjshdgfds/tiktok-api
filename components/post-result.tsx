import { CheckIcon, ExternalIcon, PlayIcon } from '@/components/icons';
import { DataRow } from '@/components/data-row';
import { Metric } from '@/components/metric';
import { formatDateTime, formatDuration } from '@/lib/format';
import type { PostData } from '@/lib/types';

export function PostResult({ data }: { data: PostData }) {
  const statistics = data.statistics;

  return (
    <div className="animate-fade-up">
      <div className="post-layout">
        <div className="post-cover">
          {data.cover ? (
            // Upstream media is allowlisted and sanitized server-side.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.cover} alt="Aweme cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="post-cover__empty">
              <PlayIcon className="h-10 w-10" />
              <span>Cover unavailable</span>
            </div>
          )}
          {data.durationMs !== undefined ? (
            <span className="duration-tag">{formatDuration(data.durationMs)}</span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="entity-title">Aweme {data.awemeId.slice(-7)}</h2>
            {data.contentType ? <span className="privacy-tag">{data.contentType}</span> : null}
          </div>
          {data.authorUsername ? <p className="entity-handle">by @{data.authorUsername}</p> : null}
          {data.description ? (
            <p className="entity-description entity-description--post">{data.description}</p>
          ) : null}

          <dl className="post-identifiers">
            <DataRow label="Aweme ID">
              <code className="id-value">{data.awemeId}</code>
            </DataRow>
            <DataRow label="Author user ID">
              <code className="id-value">{data.authorUserId}</code>
            </DataRow>
            <DataRow label="Created">
              {data.createdAt ? formatDateTime(data.createdAt) : null}
            </DataRow>
          </dl>
        </div>
      </div>

      {statistics ? (
        <dl className="metric-grid">
          <Metric label="Plays" value={statistics.plays} />
          <Metric label="Likes" value={statistics.likes} />
          <Metric label="Comments" value={statistics.comments} />
          <Metric label="Shares" value={statistics.shares} />
          <Metric label="Forwards" value={statistics.forwards} />
        </dl>
      ) : null}

      <div className="split-sheet">
        <dl className="data-sheet data-sheet--open">
          <DataRow label="Selected Aweme region">
            <span className="region-value">{data.postRegion}</span>
          </DataRow>
          <DataRow label="Author region">
            <span className="region-value">{data.authorRegion}</span>
          </DataRow>
          <DataRow label="Aweme type">{data.awemeType}</DataRow>
          <DataRow label="Download allowed">
            {data.downloadAllowed !== undefined ? (
              <span
                className={data.downloadAllowed ? 'boolean-tag boolean-tag--yes' : 'boolean-tag'}
              >
                {data.downloadAllowed ? <CheckIcon /> : null}
                {data.downloadAllowed ? 'Yes' : 'No'}
              </span>
            ) : null}
          </DataRow>
        </dl>

        {data.music ? (
          <div className="music-panel">
            <p className="section-label">Music</p>
            {data.music.title ? <h3>{data.music.title}</h3> : null}
            {data.music.author ? <p>by {data.music.author}</p> : null}
            {data.music.durationSeconds !== undefined ? (
              <span>{formatDuration(data.music.durationSeconds * 1000)}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {data.playbackUrls?.length ? (
        <div className="media-links">
          <p className="section-label">Sanitized playback URLs</p>
          <div className="mt-3 space-y-2">
            {data.playbackUrls.map((url, index) => (
              <a
                key={`${url}:${index}`}
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="media-link"
              >
                <span className="truncate">Media URL {index + 1}</span>
                <ExternalIcon />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
