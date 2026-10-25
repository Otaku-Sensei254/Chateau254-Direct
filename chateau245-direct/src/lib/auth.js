import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';

const NEON_AUTH_URL = process.env.REACT_APP_NEON_AUTH_URL || 'https://ep-noisy-cloud-axhxnu7n.neonauth.c-4.us-east-2.aws.neon.tech/chateau254/auth';

export const authClient = createAuthClient(NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
});

export default authClient;