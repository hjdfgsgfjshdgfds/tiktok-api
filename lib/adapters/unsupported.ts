import { LookupError } from '@/lib/errors';

export function unsupportedAdapter(name: string): never {
  throw new LookupError(
    'unsupported_input',
    `${name} is not enabled because the connected repository does not contain reproducible endpoint evidence.`,
    { validationStatus: 'unsupported' },
  );
}
