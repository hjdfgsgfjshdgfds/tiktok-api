import { describe, expect, it } from 'vitest';
import { toLookupError } from '@/lib/errors';
import { sleep } from '@/lib/utils';

describe('abortable lookup utilities', () => {
  it('aborts retry delays and maps the abort to a timeout error', async () => {
    const controller = new AbortController();
    const pending = sleep(10_000, controller.signal);
    controller.abort();

    try {
      await pending;
      throw new Error('Expected sleep to abort');
    } catch (error) {
      expect(toLookupError(error)).toMatchObject({ code: 'timeout', status: 504 });
    }
  });
});
