import type { AdapterContext, AdapterOutcome } from '@/lib/adapters/types';
import { awemeAdapter } from '@/lib/adapters/aweme';
import { profileAdapter } from '@/lib/adapters/profile';
import { publicAwemeAdapter } from '@/lib/adapters/public-aweme';
import { publicProfileAdapter } from '@/lib/adapters/public-profile';

export function executeAdapter(context: AdapterContext): Promise<AdapterOutcome> {
  const profileInput = context.input.type === 'username' || context.input.type === 'user_id';
  if (context.mode === 'public-live') {
    return profileInput ? publicProfileAdapter(context) : publicAwemeAdapter(context);
  }
  return profileInput ? profileAdapter(context) : awemeAdapter(context);
}
