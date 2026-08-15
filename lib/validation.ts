import { LookupError } from '@/lib/errors';
import { legacyPostSchema, legacyUserSchema } from '@/lib/schemas';
import { isRecord } from '@/lib/utils';

function statusCode(value: unknown): number | undefined {
  if (!isRecord(value)) return undefined;
  return typeof value.status_code === 'number' ? value.status_code : undefined;
}

export function assertSuccessfulEnvelope(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new LookupError('upstream_malformed', 'The upstream response was not a JSON object.');
  }

  const code = statusCode(value);
  if (code === undefined) {
    throw new LookupError('upstream_malformed', 'The upstream response omitted status_code.');
  }
  if (code !== 0) {
    throw new LookupError('upstream_error', `TikTok returned status_code ${code}.`, {
      detail: typeof value.status_msg === 'string' ? value.status_msg : undefined,
    });
  }
  return value;
}

export interface ValidatedSearchUser {
  user: Record<string, unknown>;
  path: string;
}

export function validateExactUsernameSearch(
  value: unknown,
  requestedUsername: string,
): ValidatedSearchUser {
  const envelope = assertSuccessfulEnvelope(value);
  if (!Array.isArray(envelope.user_list)) {
    throw new LookupError('upstream_malformed', 'The user search response omitted user_list.');
  }

  for (let index = 0; index < envelope.user_list.length; index += 1) {
    const item = envelope.user_list[index];
    if (!isRecord(item) || !isRecord(item.user_info)) continue;
    const parsed = legacyUserSchema.safeParse(item.user_info);
    if (!parsed.success) continue;
    if (parsed.data.unique_id?.toLowerCase() === requestedUsername.toLowerCase()) {
      return { user: parsed.data, path: `user_list[${index}].user_info` };
    }
  }

  throw new LookupError('target_missing', 'No exact username match was returned.', {
    validationStatus: 'target_missing',
  });
}

export interface ValidatedProfile {
  user: Record<string, unknown>;
  path: 'user';
}

export function validateProfileResponse(
  value: unknown,
  requestedUserId?: string,
): ValidatedProfile {
  const envelope = assertSuccessfulEnvelope(value);
  const parsed = legacyUserSchema.safeParse(envelope.user);
  if (!parsed.success) {
    throw new LookupError(
      'upstream_malformed',
      'The profile response did not contain a valid user.',
    );
  }

  if (requestedUserId && parsed.data.uid !== requestedUserId) {
    throw new LookupError(
      'target_missing',
      'The returned profile did not match the requested user ID.',
      {
        detail: `Expected ${requestedUserId}; received ${parsed.data.uid ?? 'no uid'}.`,
        validationStatus: 'target_missing',
      },
    );
  }

  return { user: parsed.data, path: 'user' };
}

export interface ValidatedAweme {
  post: Record<string, unknown>;
  path: string;
}

function candidateAwemes(
  envelope: Record<string, unknown>,
): Array<{ value: unknown; path: string }> {
  const candidates: Array<{ value: unknown; path: string }> = [];
  if (envelope.aweme_detail !== undefined) {
    candidates.push({ value: envelope.aweme_detail, path: 'aweme_detail' });
  }
  if (Array.isArray(envelope.aweme_list)) {
    envelope.aweme_list.forEach((item, index) => {
      candidates.push({ value: item, path: `aweme_list[${index}]` });
    });
  }
  return candidates;
}

export function validateExactAweme(
  value: unknown,
  requestedAwemeId: string,
  expectedAuthorUid?: string,
): ValidatedAweme {
  const envelope = assertSuccessfulEnvelope(value);
  const hasCandidateContainer =
    envelope.aweme_detail !== undefined || Array.isArray(envelope.aweme_list);
  if (!hasCandidateContainer) {
    throw new LookupError(
      'upstream_malformed',
      'The response contained no Aweme candidate container.',
    );
  }

  const candidates = candidateAwemes(envelope);
  if (candidates.length === 0) {
    throw new LookupError('target_missing', 'The requested Aweme was absent from the response.', {
      detail: `The Aweme candidate container was empty for requested aweme_id ${requestedAwemeId}.`,
      validationStatus: 'target_missing',
    });
  }

  let sawStructurallyValidCandidate = false;
  for (const candidate of candidates) {
    const parsed = legacyPostSchema.safeParse(candidate.value);
    if (!parsed.success) continue;
    sawStructurallyValidCandidate = true;
    if (parsed.data.aweme_id !== requestedAwemeId) continue;

    if (expectedAuthorUid) {
      const nestedUid = parsed.data.author?.uid;
      const authorUid = nestedUid ?? parsed.data.author_user_id;
      if (authorUid !== expectedAuthorUid) {
        throw new LookupError(
          'target_missing',
          'The Aweme author did not match the expected user ID.',
          {
            detail: `Expected author ${expectedAuthorUid}; received ${authorUid ?? 'no author uid'}.`,
            validationStatus: 'target_missing',
          },
        );
      }
    }

    return { post: parsed.data, path: candidate.path };
  }

  if (!sawStructurallyValidCandidate) {
    throw new LookupError('upstream_malformed', 'The returned Aweme candidates were malformed.');
  }

  throw new LookupError('target_missing', 'The requested Aweme was absent from the response.', {
    detail: `No candidate had aweme_id ${requestedAwemeId}.`,
    validationStatus: 'target_missing',
  });
}
