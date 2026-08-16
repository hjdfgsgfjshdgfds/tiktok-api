import { safePublicMediaUrl } from '@/lib/redact';
import { compactFields, createField } from '@/lib/provenance';
import type { LookupIssue, ProfileData } from '@/lib/types';
import { isRecord } from '@/lib/utils';

interface NormalizeWebProfileOptions {
  user: Record<string, unknown>;
  stats?: Record<string, unknown>;
  userPath: string;
  statsPath?: string;
  sourceEndpoint: string;
  retrievedAt: string;
}

interface SelectedValue<T> {
  value?: T;
  path: string;
}

function firstValue<T>(
  object: Record<string, unknown> | undefined,
  basePath: string,
  keys: readonly string[],
  convert: (value: unknown) => T | undefined,
): SelectedValue<T> {
  for (const key of keys) {
    const value = convert(object?.[key]);
    if (value !== undefined) return { value, path: `${basePath}.${key}` };
  }
  return { path: `${basePath}.${keys[0]}` };
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

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  return undefined;
}

function epochToIso(value: unknown): string | undefined {
  const seconds = asNumber(value);
  if (seconds === undefined || seconds <= 0) return undefined;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
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

function firstAvatar(
  user: Record<string, unknown>,
  userPath: string,
): { primary?: string; variants: string[]; path: string } {
  const candidates = [
    ['avatarLarger', user.avatarLarger],
    ['avatarMedium', user.avatarMedium],
    ['avatarThumb', user.avatarThumb],
    ['avatar_larger', user.avatar_larger],
    ['avatar_medium', user.avatar_medium],
    ['avatar_thumb', user.avatar_thumb],
  ] as const;
  const variants: string[] = [];
  let primary: string | undefined;
  let path = `${userPath}.avatarThumb.urlList[0]`;
  for (const [key, value] of candidates) {
    const urls = urlList(value);
    if (!primary && urls[0]) {
      primary = urls[0];
      path = `${userPath}.${key}.${key.includes('_') ? 'url_list' : 'urlList'}[0]`;
    }
    variants.push(...urls);
  }
  return { primary, variants: [...new Set(variants)], path };
}

export function normalizeWebProfile(options: NormalizeWebProfileOptions) {
  const { user, stats, userPath, statsPath = userPath, sourceEndpoint, retrievedAt } = options;
  const avatar = firstAvatar(user, userPath);
  const userId = firstValue(user, userPath, ['id', 'uid'], asString);
  const secUid = firstValue(user, userPath, ['secUid', 'sec_uid'], asString);
  const username = firstValue(user, userPath, ['uniqueId', 'unique_id', 'username'], asString);
  const nickname = firstValue(user, userPath, ['nickname'], asString);
  const signature = firstValue(user, userPath, ['signature', 'bioDescription'], asString);
  const region = firstValue(user, userPath, ['region', 'account_region'], asString);
  const language = firstValue(user, userPath, ['language', 'signature_language'], asString);
  const verified = firstValue(user, userPath, ['verified', 'is_verified'], asBoolean);
  const privateAccount = firstValue(user, userPath, ['privateAccount', 'secret'], asBoolean);
  const followers = firstValue(
    stats ?? user,
    stats ? statsPath : userPath,
    ['followerCount', 'follower_count'],
    asNumber,
  );
  const following = firstValue(
    stats ?? user,
    stats ? statsPath : userPath,
    ['followingCount', 'following_count'],
    asNumber,
  );
  const friends = firstValue(
    stats ?? user,
    stats ? statsPath : userPath,
    ['friendCount', 'friendsCount', 'friend_count'],
    asNumber,
  );
  const hearts = firstValue(
    stats ?? user,
    stats ? statsPath : userPath,
    ['heartCount', 'heart', 'totalFavorited', 'total_favorited'],
    asNumber,
  );
  const videoCount = firstValue(
    stats ?? user,
    stats ? statsPath : userPath,
    ['videoCount', 'awemeCount', 'aweme_count'],
    asNumber,
  );
  const favoritingCount = firstValue(
    stats ?? user,
    stats ? statsPath : userPath,
    ['diggCount', 'favoritingCount', 'favoriting_count'],
    asNumber,
  );
  const nicknameModifiedAt = firstValue(
    user,
    userPath,
    ['nicknameModifyTime', 'nickname_modify_time'],
    epochToIso,
  );
  const usernameModifiedAt = firstValue(
    user,
    userPath,
    ['uniqueIdModifyTime', 'unique_id_modify_time'],
    epochToIso,
  );
  const storyAvailable = firstValue(user, userPath, ['storyStatus', 'story_status'], (value) => {
    const status = asNumber(value);
    return status === undefined ? undefined : status > 0;
  });

  const data: ProfileData = {
    kind: 'profile',
    avatar: avatar.primary,
    avatarVariants: avatar.variants.length ? avatar.variants : undefined,
    nickname: nickname.value,
    username: username.value,
    userId: userId.value,
    secUid: secUid.value,
    signature: signature.value,
    verified: verified.value,
    privateAccount: privateAccount.value,
    language: language.value,
    region: region.value,
    followers: followers.value,
    following: following.value,
    friends: friends.value,
    hearts: hearts.value,
    videoCount: videoCount.value,
    favoritingCount: favoritingCount.value,
    diggCount: favoritingCount.value,
    nicknameModifiedAt: nicknameModifiedAt.value,
    usernameModifiedAt: usernameModifiedAt.value,
    storyAvailable: storyAvailable.value,
  };

  const fields = compactFields([
    createField({
      label: 'Avatar',
      value: data.avatar,
      sourceEndpoint,
      upstreamPath: avatar.path,
      retrievedAt,
    }),
    createField({
      label: 'Avatar variants',
      value: data.avatarVariants,
      sourceEndpoint,
      upstreamPath: `${userPath}.avatar*`,
      retrievedAt,
    }),
    createField({
      label: 'Nickname',
      value: data.nickname,
      sourceEndpoint,
      upstreamPath: nickname.path,
      retrievedAt,
    }),
    createField({
      label: 'Username',
      value: data.username,
      sourceEndpoint,
      upstreamPath: username.path,
      retrievedAt,
    }),
    createField({
      label: 'Permanent user ID',
      value: data.userId,
      sourceEndpoint,
      upstreamPath: userId.path,
      retrievedAt,
    }),
    createField({
      label: 'secUid',
      value: data.secUid,
      sourceEndpoint,
      upstreamPath: secUid.path,
      retrievedAt,
    }),
    createField({
      label: 'Signature',
      value: data.signature,
      sourceEndpoint,
      upstreamPath: signature.path,
      retrievedAt,
    }),
    createField({
      label: 'Verified',
      value: data.verified,
      sourceEndpoint,
      upstreamPath: verified.path,
      retrievedAt,
    }),
    createField({
      label: 'Private account',
      value: data.privateAccount,
      sourceEndpoint,
      upstreamPath: privateAccount.path,
      retrievedAt,
    }),
    createField({
      label: 'Profile language',
      value: data.language,
      sourceEndpoint,
      upstreamPath: language.path,
      retrievedAt,
    }),
    createField({
      label: 'Profile region',
      value: data.region,
      sourceEndpoint,
      upstreamPath: region.path,
      retrievedAt,
      explanation:
        'This is TikTok profile-region metadata. It is not labeled as signup country or current physical location.',
    }),
    createField({
      label: 'Followers',
      value: data.followers,
      sourceEndpoint,
      upstreamPath: followers.path,
      retrievedAt,
    }),
    createField({
      label: 'Following',
      value: data.following,
      sourceEndpoint,
      upstreamPath: following.path,
      retrievedAt,
    }),
    createField({
      label: 'Friends',
      value: data.friends,
      sourceEndpoint,
      upstreamPath: friends.path,
      retrievedAt,
    }),
    createField({
      label: 'Hearts / likes',
      value: data.hearts,
      sourceEndpoint,
      upstreamPath: hearts.path,
      retrievedAt,
    }),
    createField({
      label: 'Video count',
      value: data.videoCount,
      sourceEndpoint,
      upstreamPath: videoCount.path,
      retrievedAt,
    }),
    createField({
      label: 'Digg count',
      value: data.diggCount,
      sourceEndpoint,
      upstreamPath: favoritingCount.path,
      retrievedAt,
    }),
    createField({
      label: 'Nickname modified',
      value: data.nicknameModifiedAt,
      sourceEndpoint,
      upstreamPath: nicknameModifiedAt.path,
      retrievedAt,
    }),
    createField({
      label: 'Username modified',
      value: data.usernameModifiedAt,
      sourceEndpoint,
      upstreamPath: usernameModifiedAt.path,
      retrievedAt,
    }),
    createField({
      label: 'Story available',
      value: data.storyAvailable,
      sourceEndpoint,
      upstreamPath: storyAvailable.path,
      retrievedAt,
    }),
  ]);

  const warnings: LookupIssue[] = [];
  const partial = !data.username || !data.userId;
  if (partial) {
    warnings.push({
      code: 'partial_profile',
      message: 'The exact profile was found, but TikTok omitted one or more core display fields.',
    });
  }

  return { data, fields, warnings, partial };
}
