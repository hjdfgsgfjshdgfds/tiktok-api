import { LookupError, toLookupError } from '@/lib/errors';
import { normalizePost } from '@/lib/normalize/post';
import { sanitizeRaw } from '@/lib/redact';
import { isRecord, sleep } from '@/lib/utils';
import { validateExactAweme } from '@/lib/validation';
import type { AdapterContext, AdapterOutcome } from '@/lib/adapters/types';
import type { ResultSource } from '@/lib/types';
import { attachAdapterFailure, makeSource, sourceEndpointLabel } from '@/lib/adapters/source';

export async function awemeAdapter(context: AdapterContext): Promise<AdapterOutcome> {
  const awemeId = context.input.awemeId;
  if (!awemeId) throw new LookupError('invalid_input', 'The normalized Aweme ID is missing.');

  const sources: ResultSource[] = [];
  const rawAttempts: unknown[] = [];
  const maximumAttempts = 1 + context.targetMissingRetries;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const source = makeSource('legacy-aweme-detail', context.mode, { attempt });
    sources.push(source);

    try {
      const response = await context.client.get(
        '/aweme/v1/aweme/detail/',
        {
          aweme_id: awemeId,
        },
        { signal: context.signal },
      );
      source.httpStatus = response.httpStatus;
      rawAttempts.push(response.data);

      const validated = validateExactAweme(response.data, awemeId);
      source.validation = 'validated';

      if (context.input.username) {
        const author = validated.post.author;
        const returnedUsername = isRecord(author) ? author.unique_id : undefined;
        if (
          typeof returnedUsername === 'string' &&
          returnedUsername.toLowerCase() !== context.input.username.toLowerCase()
        ) {
          source.validation = 'target_missing';
          throw new LookupError(
            'target_missing',
            'The post author did not match the username in the TikTok URL.',
            { validationStatus: 'target_missing' },
          );
        }
      }

      const normalized = normalizePost({
        post: validated.post,
        rootPath: validated.path,
        sourceEndpoint: sourceEndpointLabel(source),
        retrievedAt: context.retrievedAt,
      });

      return {
        adapter: 'awemeAdapter',
        entityType: 'post',
        data: normalized.data,
        fields: normalized.fields,
        sources,
        warnings: normalized.warnings,
        attemptCount: attempt,
        validationStatus: normalized.partial ? 'partial' : 'validated',
        raw: context.includeRaw ? sanitizeRaw({ attempts: rawAttempts }) : undefined,
      };
    } catch (error) {
      const current = toLookupError(error);
      if (!source.validation) source.validation = current.validationStatus;
      if (current.code === 'target_missing' && attempt < maximumAttempts) {
        await sleep(125 * attempt, context.signal);
        continue;
      }
      throw attachAdapterFailure(current, {
        sources,
        raw: context.includeRaw ? sanitizeRaw({ attempts: rawAttempts }) : undefined,
        attemptCount: attempt,
      });
    }
  }

  throw new LookupError('target_missing', 'The requested Aweme was not returned.', {
    sources,
    attemptCount: maximumAttempts,
    validationStatus: 'target_missing',
  });
}
