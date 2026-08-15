import { compactFields, createField } from '@/lib/provenance';
import { safePublicMediaUrl } from '@/lib/redact';
import type { LookupIssue, PostData, PostStatistics } from '@/lib/types';
import { epochSecondsToIso, isRecord } from '@/lib/utils';
import { mediaUrls, numberValue, stringValue, uniqueStrings } from '@/lib/normalize/helpers';

interface NormalizePostOptions {
  post: Record<string, unknown>;
  rootPath: string;
  sourceEndpoint: string;
  retrievedAt: string;
}

export interface NormalizedPost {
  data: PostData;
  fields: ReturnType<typeof compactFields>;
  warnings: LookupIssue[];
  partial: boolean;
}

export function normalizePost(options: NormalizePostOptions): NormalizedPost {
  const { post, rootPath, sourceEndpoint, retrievedAt } = options;
  const author = isRecord(post.author) ? post.author : {};
  const statisticsRaw = isRecord(post.statistics) ? post.statistics : {};
  const video = isRecord(post.video) ? post.video : undefined;
  const statusRaw = isRecord(post.status) ? post.status : {};
  const musicRaw = isRecord(post.music) ? post.music : undefined;

  const awemeId = stringValue(post.aweme_id) ?? '';
  const authorUserId = stringValue(author.uid) ?? stringValue(post.author_user_id);
  const coverUrls = video ? mediaUrls(video.cover) : [];
  const originCoverUrls = video ? mediaUrls(video.origin_cover) : [];
  const coverVariants = video
    ? uniqueStrings([...coverUrls, ...originCoverUrls])
    : [];
  const cover = coverUrls[0] ?? originCoverUrls[0];
  const coverPath = coverUrls[0]
    ? `${rootPath}.video.cover.url_list[0]`
    : `${rootPath}.video.origin_cover.url_list[0]`;
  const rawDownloads = video ? mediaUrls(video.download_addr) : [];
  const playbackUrls = uniqueStrings(rawDownloads.map(safePublicMediaUrl));
  const preventDownload = typeof post.prevent_download === 'boolean' ? post.prevent_download : undefined;
  const downloadStatus = numberValue(statusRaw.download_status);
  let downloadAllowed: boolean | undefined;
  if (preventDownload === true || downloadStatus === 1) {
    downloadAllowed = false;
  } else if (
    (preventDownload === false && (downloadStatus === undefined || downloadStatus === 0)) ||
    (preventDownload === undefined && downloadStatus === 0)
  ) {
    downloadAllowed = true;
  }

  const statistics: PostStatistics = {
    comments: numberValue(statisticsRaw.comment_count),
    likes: numberValue(statisticsRaw.digg_count),
    plays: numberValue(statisticsRaw.play_count),
    shares: numberValue(statisticsRaw.share_count),
    forwards: numberValue(statisticsRaw.forward_count)
  };
  const hasStatistics = Object.values(statistics).some((value) => value !== undefined);

  const createdAtEpoch = numberValue(post.create_time);
  const data: PostData = {
    kind: 'post',
    cover,
    awemeId,
    description: stringValue(post.desc),
    createdAt: epochSecondsToIso(post.create_time),
    createdAtEpoch,
    authorUsername: stringValue(author.unique_id),
    authorUserId,
    postRegion: stringValue(post.region),
    authorRegion: stringValue(author.region),
    statistics: hasStatistics ? statistics : undefined,
    durationMs: video ? numberValue(video.duration) : undefined,
    contentType: video ? 'video' : undefined,
    awemeType: numberValue(post.aweme_type),
    music: musicRaw
      ? {
          id: stringValue(musicRaw.id),
          title: stringValue(musicRaw.title),
          author: stringValue(musicRaw.author),
          durationSeconds: numberValue(musicRaw.duration)
        }
      : undefined,
    playbackUrls: downloadAllowed && playbackUrls.length > 0 ? playbackUrls : undefined,
    downloadAllowed,
    status: {
      private:
        typeof statusRaw.is_private === 'boolean' ? statusRaw.is_private : undefined,
      deleted: typeof statusRaw.is_delete === 'boolean' ? statusRaw.is_delete : undefined,
      commentsAllowed:
        typeof statusRaw.allow_comment === 'boolean' ? statusRaw.allow_comment : undefined,
      sharingAllowed:
        typeof statusRaw.allow_share === 'boolean' ? statusRaw.allow_share : undefined
    }
  };

  if (Object.values(data.status ?? {}).every((value) => value === undefined)) data.status = undefined;
  if (data.music && Object.values(data.music).every((value) => value === undefined)) data.music = undefined;

  const fields = compactFields([
    createField({
      label: 'Cover image',
      value: data.cover,
      sourceEndpoint,
      upstreamPath: coverPath,
      retrievedAt
    }),
    createField({
      label: 'Post / Aweme ID',
      value: awemeId,
      sourceEndpoint,
      upstreamPath: `${rootPath}.aweme_id`,
      retrievedAt
    }),
    createField({
      label: 'Description',
      value: data.description,
      sourceEndpoint,
      upstreamPath: `${rootPath}.desc`,
      retrievedAt
    }),
    createField({
      label: 'Created at',
      value: data.createdAt,
      sourceEndpoint,
      upstreamPath: `${rootPath}.create_time`,
      retrievedAt,
      status: 'derived',
      origin: 'local',
      explanation: 'Converted locally from the post creation Unix timestamp.'
    }),
    createField({
      label: 'Author username',
      value: data.authorUsername,
      sourceEndpoint,
      upstreamPath: `${rootPath}.author.unique_id`,
      retrievedAt
    }),
    createField({
      label: 'Author user ID',
      value: authorUserId,
      sourceEndpoint,
      upstreamPath: stringValue(author.uid)
        ? `${rootPath}.author.uid`
        : `${rootPath}.author_user_id`,
      retrievedAt
    }),
    createField({
      label: 'Selected Aweme region',
      value: data.postRegion,
      sourceEndpoint,
      upstreamPath: `${rootPath}.region`,
      retrievedAt,
      explanation: 'This is the selected Aweme’s region field, not an account-origin claim.'
    }),
    createField({
      label: 'Author region',
      value: data.authorRegion,
      sourceEndpoint,
      upstreamPath: `${rootPath}.author.region`,
      retrievedAt,
      explanation: 'Kept separate from the selected Aweme region.'
    }),
    createField({
      label: 'Comment count',
      value: statistics.comments,
      sourceEndpoint,
      upstreamPath: `${rootPath}.statistics.comment_count`,
      retrievedAt
    }),
    createField({
      label: 'Like count',
      value: statistics.likes,
      sourceEndpoint,
      upstreamPath: `${rootPath}.statistics.digg_count`,
      retrievedAt
    }),
    createField({
      label: 'Play count',
      value: statistics.plays,
      sourceEndpoint,
      upstreamPath: `${rootPath}.statistics.play_count`,
      retrievedAt
    }),
    createField({
      label: 'Share count',
      value: statistics.shares,
      sourceEndpoint,
      upstreamPath: `${rootPath}.statistics.share_count`,
      retrievedAt
    }),
    createField({
      label: 'Forward count',
      value: statistics.forwards,
      sourceEndpoint,
      upstreamPath: `${rootPath}.statistics.forward_count`,
      retrievedAt
    }),
    createField({
      label: 'Duration',
      value: data.durationMs,
      sourceEndpoint,
      upstreamPath: `${rootPath}.video.duration`,
      retrievedAt,
      explanation: 'Duration is in milliseconds in the connected repository’s video type.'
    }),
    createField({
      label: 'Content type',
      value: data.contentType,
      sourceEndpoint,
      upstreamPath: `${rootPath}.video`,
      retrievedAt,
      status: 'derived',
      origin: 'local',
      explanation: 'Classified as video only when a video object is present.'
    }),
    createField({
      label: 'Aweme type',
      value: data.awemeType,
      sourceEndpoint,
      upstreamPath: `${rootPath}.aweme_type`,
      retrievedAt
    }),
    createField({
      label: 'Music',
      value: data.music,
      sourceEndpoint,
      upstreamPath: `${rootPath}.music`,
      retrievedAt
    }),
    createField({
      label: 'Playback / download URLs',
      value: data.playbackUrls,
      sourceEndpoint,
      upstreamPath: `${rootPath}.video.download_addr.url_list`,
      retrievedAt,
      explanation: 'Only returned when downloading is permitted; sensitive URL parameters are redacted.'
    }),
    createField({
      label: 'Download allowed',
      value: downloadAllowed,
      sourceEndpoint,
      upstreamPath: `${rootPath}.prevent_download + ${rootPath}.status.download_status`,
      retrievedAt,
      status: 'derived',
      origin: 'local'
    }),
    createField({
      label: 'Post status',
      value: data.status,
      sourceEndpoint,
      upstreamPath: `${rootPath}.status`,
      retrievedAt
    })
  ]);

  const warnings: LookupIssue[] = [];
  const partial = !awemeId || !data.authorUserId || !video || !hasStatistics;
  if (partial) {
    warnings.push({
      code: 'partial_post',
      message: 'The requested Aweme was validated, but some expected display fields were unavailable.'
    });
  }
  if (rawDownloads.length > 0 && playbackUrls.length === 0) {
    warnings.push({
      code: 'media_urls_hidden',
      message: 'Playback URLs were omitted because none passed the safe media-host policy.'
    });
  }

  return { data, fields, warnings, partial };
}
