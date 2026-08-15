import { compactFields, createField } from '@/lib/provenance';
import type { LookupIssue, ProfileData } from '@/lib/types';
import { epochSecondsToIso, isRecord } from '@/lib/utils';
import { mediaUrls, numberValue, stringValue, uniqueStrings } from '@/lib/normalize/helpers';

interface NormalizeProfileOptions {
  user: Record<string, unknown>;
  rootPath: string;
  sourceEndpoint: string;
  retrievedAt: string;
}

export interface NormalizedProfile {
  data: ProfileData;
  fields: ReturnType<typeof compactFields>;
  warnings: LookupIssue[];
  partial: boolean;
}

export function normalizeProfile(options: NormalizeProfileOptions): NormalizedProfile {
  const { user, rootPath, sourceEndpoint, retrievedAt } = options;
  const larger = mediaUrls(user.avatar_larger);
  const medium = mediaUrls(user.avatar_medium);
  const thumb = mediaUrls(user.avatar_thumb);
  const avatarVariants = uniqueStrings([...larger, ...medium, ...thumb]);
  const avatar = larger[0] ?? medium[0] ?? thumb[0];
  const avatarPath = larger[0]
    ? `${rootPath}.avatar_larger.url_list[0]`
    : medium[0]
      ? `${rootPath}.avatar_medium.url_list[0]`
      : `${rootPath}.avatar_thumb.url_list[0]`;

  const userId = stringValue(user.uid);
  const username = stringValue(user.unique_id);
  const nickname = stringValue(user.nickname);
  const signature = stringValue(user.signature);
  const region = stringValue(user.region);
  const verified = typeof user.is_verified === 'boolean' ? user.is_verified : undefined;
  const privateAccount = numberValue(user.secret) !== undefined ? user.secret === 1 : undefined;
  const accountCreatedAt = epochSecondsToIso(user.create_time);

  const data: ProfileData = {
    kind: 'profile',
    avatar,
    avatarVariants: avatarVariants.length > 0 ? avatarVariants : undefined,
    nickname,
    username,
    userId,
    signature,
    verified,
    privateAccount,
    region,
    followers: numberValue(user.follower_count),
    following: numberValue(user.following_count),
    hearts: numberValue(user.total_favorited),
    videoCount: numberValue(user.aweme_count),
    favoritingCount: numberValue(user.favoriting_count),
    accountCreatedAt
  };

  const fields = compactFields([
    createField({
      label: 'Avatar',
      value: data.avatar,
      sourceEndpoint,
      upstreamPath: avatarPath,
      retrievedAt
    }),
    createField({
      label: 'Avatar variants',
      value: data.avatarVariants,
      sourceEndpoint,
      upstreamPath: `${rootPath}.avatar_larger|avatar_medium|avatar_thumb.url_list`,
      retrievedAt
    }),
    createField({
      label: 'Nickname',
      value: nickname,
      sourceEndpoint,
      upstreamPath: `${rootPath}.nickname`,
      retrievedAt
    }),
    createField({
      label: 'Username',
      value: username,
      sourceEndpoint,
      upstreamPath: `${rootPath}.unique_id`,
      retrievedAt
    }),
    createField({
      label: 'Permanent user ID',
      value: userId,
      sourceEndpoint,
      upstreamPath: `${rootPath}.uid`,
      retrievedAt
    }),
    createField({
      label: 'Signature',
      value: signature,
      sourceEndpoint,
      upstreamPath: `${rootPath}.signature`,
      retrievedAt
    }),
    createField({
      label: 'Verified',
      value: verified,
      sourceEndpoint,
      upstreamPath: `${rootPath}.is_verified`,
      retrievedAt
    }),
    createField({
      label: 'Private account',
      value: privateAccount,
      sourceEndpoint,
      upstreamPath: `${rootPath}.secret`,
      retrievedAt,
      status: 'derived',
      origin: 'local',
      explanation: 'Derived locally as secret === 1.'
    }),
    createField({
      label: 'Profile region',
      value: region,
      sourceEndpoint,
      upstreamPath: `${rootPath}.region`,
      retrievedAt,
      explanation: 'Kept as the profile region field; not relabeled as account origin.'
    }),
    createField({
      label: 'Followers',
      value: data.followers,
      sourceEndpoint,
      upstreamPath: `${rootPath}.follower_count`,
      retrievedAt
    }),
    createField({
      label: 'Following',
      value: data.following,
      sourceEndpoint,
      upstreamPath: `${rootPath}.following_count`,
      retrievedAt
    }),
    createField({
      label: 'Hearts / likes received',
      value: data.hearts,
      sourceEndpoint,
      upstreamPath: `${rootPath}.total_favorited`,
      retrievedAt
    }),
    createField({
      label: 'Video count',
      value: data.videoCount,
      sourceEndpoint,
      upstreamPath: `${rootPath}.aweme_count`,
      retrievedAt
    }),
    createField({
      label: 'Liked-video count',
      value: data.favoritingCount,
      sourceEndpoint,
      upstreamPath: `${rootPath}.favoriting_count`,
      retrievedAt
    }),
    createField({
      label: 'Account created (legacy field)',
      value: accountCreatedAt,
      sourceEndpoint,
      upstreamPath: `${rootPath}.create_time`,
      retrievedAt,
      confidence: 'medium',
      status: 'legacy-documented',
      explanation:
        'The connected legacy repository documents user.create_time as account creation time. It is not inferred from post createTime.'
    })
  ]);

  const warnings: LookupIssue[] = [];
  const partial = !userId || !username || !nickname || avatarVariants.length === 0;
  if (partial) {
    warnings.push({
      code: 'partial_profile',
      message: 'The upstream returned a profile with some primary fields missing.'
    });
  }
  if (avatarVariants.length === 0) {
    warnings.push({
      code: 'avatar_unavailable',
      message: 'No safe avatar URL was available in the response.'
    });
  }

  return { data, fields, warnings, partial };
}
