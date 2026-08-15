import { beforeEach, describe, expect, it } from 'vitest';
import { resetEnvForTests } from '@/lib/env';
import { MOCK_IDS } from '@/lib/mock/fixtures';
import { resetOrchestratorForTests, runLookup } from '@/lib/orchestrator';

function configureMockEnv() {
  process.env.LOOKUP_MODE = 'mock';
  process.env.ALLOW_RAW_VIEWER = 'true';
  process.env.TARGET_MISSING_RETRIES = '1';
  process.env.CACHE_TTL_SECONDS = '0';
  resetEnvForTests();
  resetOrchestratorForTests();
}

let requestCounter = 0;
function lookup(query: string, includeRaw = false) {
  requestCounter += 1;
  return runLookup({ query, includeRaw, requestId: `test-${requestCounter}` });
}

describe('mock lookup flow', () => {
  beforeEach(() => {
    configureMockEnv();
  });

  it('returns a validated profile with field provenance', async () => {
    const execution = await lookup('@example');
    expect(execution.status).toBe(200);
    expect(execution.result).toMatchObject({
      ok: true,
      entity: { type: 'profile' },
      data: {
        kind: 'profile',
        username: 'example',
        userId: MOCK_IDS.profile
      },
      meta: {
        adapter: 'profileAdapter',
        validationStatus: 'validated',
        attemptCount: 2
      }
    });
    expect(execution.result.fields.some((field) => field.upstreamPath === 'user.uid')).toBe(true);
  });

  it('returns a validated Aweme and sanitized raw data', async () => {
    const execution = await lookup(MOCK_IDS.post, true);
    expect(execution.status).toBe(200);
    expect(execution.result.data).toMatchObject({ kind: 'post', awemeId: MOCK_IDS.post });
    const raw = JSON.stringify(execution.result.raw);
    expect(raw).toContain(MOCK_IDS.post);
    expect(raw).not.toContain('fake-secret');
    expect(raw).not.toContain('fake-token');
  });

  it('returns target_missing after bounded retries when the requested Aweme is absent', async () => {
    const execution = await lookup(`aweme:${MOCK_IDS.targetMissingPost}`);
    expect(execution.status).toBe(404);
    expect(execution.result).toMatchObject({
      ok: false,
      errors: [{ code: 'target_missing' }],
      meta: { attemptCount: 2, validationStatus: 'target_missing' }
    });
    expect(execution.result.sources).toHaveLength(2);
  });

  it('disambiguates a bare 19-digit user ID only after an exact Aweme miss', async () => {
    const execution = await lookup(MOCK_IDS.profile);
    expect(execution.status).toBe(200);
    expect(execution.result.input.type).toBe('user_id');
    expect(execution.result.entity.type).toBe('profile');
    expect(execution.result.meta.attemptCount).toBe(3);
    expect(
      execution.result.warnings.some((warning) => warning.code === 'numeric_id_disambiguated'),
    ).toBe(true);
  });

  it('represents a private profile without inventing unavailable fields', async () => {
    const execution = await lookup('@private');
    expect(execution.result.data).toMatchObject({
      kind: 'profile',
      username: 'private',
      privateAccount: true
    });
    expect(execution.result.fields.some((field) => field.label === 'secUid')).toBe(false);
  });

  it('returns a successful partial result with warnings', async () => {
    const execution = await lookup(`aweme:${MOCK_IDS.partialPost}`);
    expect(execution.status).toBe(200);
    expect(execution.result.meta.validationStatus).toBe('partial');
    expect(execution.result.warnings.some((warning) => warning.code === 'partial_post')).toBe(true);
  });

  it('handles unavailable accounts', async () => {
    const execution = await lookup('@unavailable');
    expect(execution.status).toBe(404);
    expect(execution.result.errors[0]?.code).toBe('target_missing');
  });

  it('handles malformed upstream data', async () => {
    const execution = await lookup(`aweme:${MOCK_IDS.malformedPost}`);
    expect(execution.status).toBe(502);
    expect(execution.result.errors[0]?.code).toBe('upstream_malformed');
  });

  it('handles simulated HTTP 403 without retrying', async () => {
    const execution = await lookup(`aweme:${MOCK_IDS.forbiddenPost}`);
    expect(execution.status).toBe(502);
    expect(execution.result.errors[0]?.code).toBe('upstream_auth');
    expect(execution.result.meta.attemptCount).toBe(1);
  });

  it('handles simulated HTTP 429 without target-missing retries', async () => {
    const execution = await lookup(`aweme:${MOCK_IDS.rateLimitedPost}`);
    expect(execution.status).toBe(429);
    expect(execution.result.errors[0]?.code).toBe('upstream_rate_limited');
    expect(execution.result.meta.attemptCount).toBe(1);
  });

  it('handles a simulated timeout', async () => {
    const execution = await lookup(`aweme:${MOCK_IDS.timeoutPost}`);
    expect(execution.status).toBe(504);
    expect(execution.result.errors[0]?.code).toBe('timeout');
  });
});
