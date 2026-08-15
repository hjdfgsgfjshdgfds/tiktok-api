import { LookupError, toLookupError } from '@/lib/errors';
import { normalizeProfile } from '@/lib/normalize/profile';
import { sanitizeRaw } from '@/lib/redact';
import { validateExactUsernameSearch, validateProfileResponse } from '@/lib/validation';
import type { AdapterContext, AdapterOutcome } from '@/lib/adapters/types';
import type { ResultSource } from '@/lib/types';
import {
  attachAdapterFailure,
  makeSource,
  sourceEndpointLabel
} from '@/lib/adapters/source';

export async function profileAdapter(context: AdapterContext): Promise<AdapterOutcome> {
  const sources: ResultSource[] = [];
  const raw: Record<string, unknown> = {};
  let attempts = 0;

  try {
    let requestedUserId = context.input.userId;

    if (context.input.type === 'username') {
      const username = context.input.username;
      if (!username) throw new LookupError('invalid_input', 'The normalized username is missing.');

      attempts += 1;
      const searchSource = makeSource('legacy-user-search', context.mode, { attempt: attempts });
      sources.push(searchSource);
      const searchResponse = await context.client.get('/aweme/v1/discover/search/', {
        keyword: username,
        count: 20,
        cursor: 0,
        type: 1,
        retry_type: 'no_retry'
      }, { signal: context.signal });
      searchSource.httpStatus = searchResponse.httpStatus;
      raw.search = searchResponse.data;

      const match = validateExactUsernameSearch(searchResponse.data, username);
      searchSource.validation = 'validated';
      requestedUserId = typeof match.user.uid === 'string' ? match.user.uid : undefined;
      if (!requestedUserId) {
        throw new LookupError('upstream_malformed', 'The exact username match omitted uid.');
      }
    }

    if (!requestedUserId) {
      throw new LookupError('invalid_input', 'A user ID could not be resolved for profile lookup.');
    }

    attempts += 1;
    const profileSource = makeSource('legacy-profile-by-id', context.mode, { attempt: attempts });
    sources.push(profileSource);
    const profileResponse = await context.client.get('/aweme/v1/user/', {
      user_id: requestedUserId
    }, { signal: context.signal });
    profileSource.httpStatus = profileResponse.httpStatus;
    raw.profile = profileResponse.data;

    const validated = validateProfileResponse(profileResponse.data, requestedUserId);
    profileSource.validation = 'validated';
    const normalized = normalizeProfile({
      user: validated.user,
      rootPath: validated.path,
      sourceEndpoint: sourceEndpointLabel(profileSource),
      retrievedAt: context.retrievedAt
    });

    return {
      adapter: 'profileAdapter',
      entityType: 'profile',
      data: normalized.data,
      fields: normalized.fields,
      sources,
      warnings: normalized.warnings,
      attemptCount: attempts,
      validationStatus: normalized.partial ? 'partial' : 'validated',
      raw: context.includeRaw ? sanitizeRaw(raw) : undefined
    };
  } catch (error) {
    const current = toLookupError(error);
    const latest = sources.at(-1);
    if (latest && !latest.validation) latest.validation = current.validationStatus;
    throw attachAdapterFailure(current, {
      sources,
      raw: context.includeRaw ? sanitizeRaw(raw) : undefined,
      attemptCount: attempts
    });
  }
}
