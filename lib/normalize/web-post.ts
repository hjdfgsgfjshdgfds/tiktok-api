import { compactFields, createField } from '@/lib/provenance';
import { safePublicMediaUrl } from '@/lib/redact';
import type { LookupIssue, PostData, PostStatistics } from '@/lib/types';
import { isRecord } from '@/lib/utils';

interface NormalizeWebPostOptions {
  post: Record<string, unknown>;
  rootPath: string;
  sourceEndpoint: string;
  retrievedAt: string;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readNumber(
  record: Record<string, unknown> | undefined,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = asNumber(record?.[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function readString(
  record: Record<string, unknown> | undefined,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = asString(record?.[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function epochToIso(value: unknown): { iso?: string; epoch?: number } {
  const epoch = asNumber(value);
  if (epoch === undefined) return {};
  const date = new Date(epoch * 1000);
  return Number.isNaN(date.getTime()) ? { epoch } : { epoch, iso: date.toISOString() };
}

function urlList(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const list = Array.isArray(value.urlList)
    ? value.urlList
    : Array.isArray(value.url_list)
      ? value.url_list
      : [];
  return [...new Set(list.map(safePublicMediaUrl).filter((item): item is string => Boolean(item)))];
}

function firstMedia(...values: unknown[]): string | undefined {
  for (const value of values) {
    const url = urlList(value)[0];
    if (url) return url;
  }
  return undefined;
}

export function normalizeWebPost(options: NormalizeWebPostOptions) {
  const { post, rootPath, sourceEndpoint, retrievedAt } = options;
  const author = isRecord(post.author) ? post.author : undefined;
  const video = isRecord(post.video) ? post.video : undefined;
  const imagePost = isRecord(post.imagePost)
    ? post.imagePost
    : isRecord(post.image_post_info)
      ? post.image_post_info
      : undefined;
  const statsRoot = isRecord(post.statsV2)
    ? post.statsV2
    : isRecord(post.stats)
      ? post.stats
      : isRecord(post.statistics)
        ? post.statistics
        : undefined;
  const musicRoot = isRecord(post.music) ? post.music : undefined;
  const statusRoot = isRecord(post.status) ? post.status : undefined;
  const created = epochToIso(post.createTime ?? post.create_time);
  const awemeId = readString(post, 'id', 'aweme_id', 'awemeId') ?? '';

  const statistics: PostStatistics = {
    comments: readNumber(statsRoot, 'commentCount', 'comment_count'),
    likes: readNumber(statsRoot, 'diggCount', 'digg_count'),
    plays: readNumber(statsRoot, 'playCount', 'play_count'),
    shares: readNumber(statsRoot, 'shareCount', 'share_count'),
    forwards: readNumber(statsRoot, 'forwardCount', 'forward_count'),
  };
  const hasStats = Object.values(statistics).some((value) => value !== undefined);

  const imageList = Array.isArray(imagePost?.images) ? imagePost.images : [];
  const firstImage = imageList.find(isRecord);
  const cover = firstMedia(
    video?.cover,
    video?.originCover,
    video?.origin_cover,
    firstImage && (firstImage.displayImage ?? firstImage.display_image),
    imagePost?.cover,
  );
  const playUrls = [
    ...urlList(video?.playAddr ?? video?.play_addr),
    ...urlList(video?.downloadAddr ?? video?.download_addr),
  ];

  const duration = readNumber(video, 'duration');
  const contentType: PostData['contentType'] = imagePost ? 'image' : video ? 'video' : 'unknown';
  const storyMarker = isRecord(post.story) || readNumber(post, 'is_24_story') === 1;
  const preventDownload = post.prevent_download;
  const downloadAllowed =
    typeof preventDownload === 'boolean'
      ? !preventDownload
      : typeof preventDownload === 'number'
        ? preventDownload === 0
        : undefined;

  const data: PostData = {
    kind: 'post',
    cover,
    awemeId,
    description: readString(post, 'desc', 'description'),
    createdAt: created.iso,
    createdAtEpoch: created.epoch,
    authorUsername: readString(author, 'uniqueId', 'unique_id', 'username'),
    authorUserId: readString(author, 'id', 'uid') ?? readString(post, 'author_user_id'),
    authorSecUid: readString(author, 'secUid', 'sec_uid'),
    postRegion: readString(post, 'region'),
    authorRegion: readString(author, 'region', 'account_region'),
    statistics: hasStats ? statistics : undefined,
    durationMs: duration,
    contentType,
    awemeType: readNumber(post, 'awemeType', 'aweme_type'),
    music: musicRoot
      ? {
          id: readString(musicRoot, 'id', 'mid'),
          title: readString(musicRoot, 'title'),
          author: readString(musicRoot, 'authorName', 'author_name', 'author'),
          durationSeconds: readNumber(musicRoot, 'duration'),
        }
      : undefined,
    playbackUrls: playUrls.length ? [...new Set(playUrls)] : undefined,
    downloadAllowed,
    geofencing: isRecord(post.geofencing) ? post.geofencing : undefined,
    classification: storyMarker ? 'story' : 'regular',
    status: statusRoot
      ? {
          private:
            typeof statusRoot.privateItem === 'boolean'
              ? statusRoot.privateItem
              : typeof statusRoot.is_private === 'boolean'
                ? statusRoot.is_private
                : undefined,
          deleted:
            typeof statusRoot.delete === 'boolean'
              ? statusRoot.delete
              : typeof statusRoot.is_delete === 'boolean'
                ? statusRoot.is_delete
                : undefined,
          commentsAllowed:
            typeof statusRoot.allowComment === 'boolean'
              ? statusRoot.allowComment
              : typeof statusRoot.allow_comment === 'boolean'
                ? statusRoot.allow_comment
                : undefined,
          sharingAllowed:
            typeof statusRoot.allowShare === 'boolean'
              ? statusRoot.allowShare
              : typeof statusRoot.allow_share === 'boolean'
                ? statusRoot.allow_share
                : undefined,
        }
      : undefined,
  };

  const fields = compactFields([
    createField({
      label: 'Cover image',
      value: data.cover,
      sourceEndpoint,
      upstreamPath: `${rootPath}.video.cover.urlList[0]`,
      retrievedAt,
    }),
    createField({
      label: 'Aweme ID',
      value: data.awemeId,
      sourceEndpoint,
      upstreamPath: `${rootPath}.id`,
      retrievedAt,
    }),
    createField({
      label: 'Description',
      value: data.description,
      sourceEndpoint,
      upstreamPath: `${rootPath}.desc`,
      retrievedAt,
    }),
    createField({
      label: 'Created',
      value: data.createdAt,
      sourceEndpoint,
      upstreamPath: `${rootPath}.createTime`,
      retrievedAt,
    }),
    createField({
      label: 'Author username',
      value: data.authorUsername,
      sourceEndpoint,
      upstreamPath: `${rootPath}.author.uniqueId`,
      retrievedAt,
    }),
    createField({
      label: 'Author user ID',
      value: data.authorUserId,
      sourceEndpoint,
      upstreamPath: `${rootPath}.author.id`,
      retrievedAt,
    }),
    createField({
      label: 'Author secUid',
      value: data.authorSecUid,
      sourceEndpoint,
      upstreamPath: `${rootPath}.author.secUid`,
      retrievedAt,
    }),
    createField({
      label: 'Selected Aweme region',
      value: data.postRegion,
      sourceEndpoint,
      upstreamPath: `${rootPath}.region`,
      retrievedAt,
      explanation:
        'The selected content region is kept separate from author profile region and is not called account origin.',
    }),
    createField({
      label: 'Author region',
      value: data.authorRegion,
      sourceEndpoint,
      upstreamPath: `${rootPath}.author.region`,
      retrievedAt,
      explanation: 'This is author metadata, not proof of signup country or current location.',
    }),
    createField({
      label: 'Statistics',
      value: data.statistics,
      sourceEndpoint,
      upstreamPath: `${rootPath}.statsV2`,
      retrievedAt,
    }),
    createField({
      label: 'Duration',
      value: data.durationMs,
      sourceEndpoint,
      upstreamPath: `${rootPath}.video.duration`,
      retrievedAt,
    }),
    createField({
      label: 'Content type',
      value: data.contentType,
      sourceEndpoint,
      upstreamPath: imagePost ? `${rootPath}.imagePost` : `${rootPath}.video`,
      retrievedAt,
      status: 'derived',
      origin: 'local',
    }),
    createField({
      label: 'Aweme type',
      value: data.awemeType,
      sourceEndpoint,
      upstreamPath: `${rootPath}.awemeType`,
      retrievedAt,
    }),
    createField({
      label: 'Music',
      value: data.music,
      sourceEndpoint,
      upstreamPath: `${rootPath}.music`,
      retrievedAt,
    }),
    createField({
      label: 'Playback / download URLs',
      value: data.playbackUrls,
      sourceEndpoint,
      upstreamPath: `${rootPath}.video.playAddr.urlList`,
      retrievedAt,
      explanation:
        'Only allowlisted HTTPS media hosts are exposed; volatile authorization parameters are redacted.',
    }),
    createField({
      label: 'Download allowed',
      value: data.downloadAllowed,
      sourceEndpoint,
      upstreamPath: `${rootPath}.prevent_download`,
      retrievedAt,
    }),
    createField({
      label: 'Post classification',
      value: data.classification,
      sourceEndpoint,
      upstreamPath: `${rootPath}.story`,
      retrievedAt,
      status: 'derived',
      origin: 'local',
    }),
  ]);

  const warnings: LookupIssue[] = [];
  const partial = !data.awemeId || !data.authorUserId;
  if (partial) {
    warnings.push({
      code: 'partial_post',
      message: 'The exact post was found, but TikTok omitted one or more core display fields.',
    });
  }
  return { data, fields, warnings, partial };
}
