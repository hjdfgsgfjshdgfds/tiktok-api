import { describe, expect, it } from 'vitest';
import { createMockPost, createMockUser, MOCK_IDS } from '@/lib/mock/fixtures';
import {
  validateExactAweme,
  validateExactUsernameSearch,
  validateProfileResponse
} from '@/lib/validation';

async function expectLookupCode(callback: () => unknown, code: string) {
  try {
    callback();
    throw new Error('Expected callback to throw');
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

describe('response validation', () => {
  it('selects the exact requested Aweme from aweme_list', () => {
    const response = {
      status_code: 0,
      aweme_list: [createMockPost(MOCK_IDS.wrongPost), createMockPost(MOCK_IDS.post)]
    };
    const validated = validateExactAweme(response, MOCK_IDS.post);
    expect(validated.path).toBe('aweme_list[1]');
    expect(validated.post.aweme_id).toBe(MOCK_IDS.post);
  });

  it('returns target_missing for HTTP-success-shaped data containing the wrong Aweme', async () => {
    await expectLookupCode(
      () =>
        validateExactAweme(
          { status_code: 0, aweme_detail: createMockPost(MOCK_IDS.wrongPost) },
          MOCK_IDS.post,
        ),
      'target_missing',
    );
  });

  it('treats status_code 0 with an empty Aweme list as target_missing', async () => {
    await expectLookupCode(
      () => validateExactAweme({ status_code: 0, aweme_list: [] }, MOCK_IDS.post),
      'target_missing',
    );
  });

  it('requires exact expected author UID', () => {
    const response = { status_code: 0, aweme_detail: createMockPost(MOCK_IDS.post) };
    expect(validateExactAweme(response, MOCK_IDS.post, MOCK_IDS.profile).post.aweme_id).toBe(
      MOCK_IDS.post,
    );
  });

  it('rejects a mismatched expected author UID', async () => {
    await expectLookupCode(
      () =>
        validateExactAweme(
          { status_code: 0, aweme_detail: createMockPost(MOCK_IDS.post) },
          MOCK_IDS.post,
          '6999999999999999999',
        ),
      'target_missing',
    );
  });

  it('rejects empty and non-object bodies', async () => {
    await expectLookupCode(() => validateExactAweme('', MOCK_IDS.post), 'upstream_malformed');
    await expectLookupCode(() => validateExactAweme(null, MOCK_IDS.post), 'upstream_malformed');
  });

  it('rejects malformed Aweme field types', async () => {
    await expectLookupCode(
      () => validateExactAweme({ status_code: 0, aweme_detail: { aweme_id: 123 } }, MOCK_IDS.post),
      'upstream_malformed',
    );
  });

  it('validates an exact profile UID', () => {
    const user = createMockUser({ username: 'example', uid: MOCK_IDS.profile });
    expect(validateProfileResponse({ status_code: 0, user }, MOCK_IDS.profile).user.uid).toBe(
      MOCK_IDS.profile,
    );
  });

  it('rejects a wrong profile UID', async () => {
    const user = createMockUser({ username: 'example', uid: MOCK_IDS.profile });
    await expectLookupCode(
      () => validateProfileResponse({ status_code: 0, user }, MOCK_IDS.privateProfile),
      'target_missing',
    );
  });

  it('requires an exact username match from search results', () => {
    const user = createMockUser({ username: 'example', uid: MOCK_IDS.profile });
    const result = validateExactUsernameSearch(
      { status_code: 0, user_list: [{ user_info: user }] },
      'EXAMPLE',
    );
    expect(result.user.uid).toBe(MOCK_IDS.profile);
  });
});
