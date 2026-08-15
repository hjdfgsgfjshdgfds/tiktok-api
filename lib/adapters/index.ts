import type { AdapterContext, AdapterOutcome } from '@/lib/adapters/types';
import { awemeAdapter } from '@/lib/adapters/aweme';
import { profileAdapter } from '@/lib/adapters/profile';

export function executeAdapter(context: AdapterContext): Promise<AdapterOutcome> {
  if (context.input.type === 'username' || context.input.type === 'user_id') {
    return profileAdapter(context);
  }
  return awemeAdapter(context);
}
