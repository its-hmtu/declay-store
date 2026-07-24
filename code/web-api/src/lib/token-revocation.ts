import { redisOperations } from '@/lib/redis';

const JTI_PREFIX = 'revoked:jti:';
const PRINCIPAL_PREFIX = 'revoked:principal:';

export type PrincipalKind = 'user' | 'admin';

// Upper bounds on how long a revocation record must live (= longest-lived token)
export const TokenTTL = {
  USER_MAX: 7 * 24 * 60 * 60, // refresh token lifetime
  ADMIN_MAX: 8 * 60 * 60, // admin token lifetime
};

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Denylist a single token by its jti until it would have expired anyway,
 * so the record self-cleans and never outlives the token it blocks.
 */
export async function denylistToken(jti: string, expSeconds: number): Promise<void> {
  const ttl = expSeconds - nowSeconds();
  if (ttl <= 0) return; // already expired — nothing to block
  await redisOperations.set(`${JTI_PREFIX}${jti}`, '1', ttl);
}

export async function isTokenDenylisted(jti: string): Promise<boolean> {
  return redisOperations.exists(`${JTI_PREFIX}${jti}`);
}

/**
 * Revoke every token for a principal issued at/before now — used for
 * logout-all, password reset, and admin deactivate/delete/role change.
 */
export async function revokeAllForPrincipal(
  kind: PrincipalKind,
  id: number,
  ttlSeconds: number,
): Promise<void> {
  await redisOperations.set(`${PRINCIPAL_PREFIX}${kind}:${id}`, nowSeconds(), ttlSeconds);
}

export async function isIssuedBeforeRevocation(
  kind: PrincipalKind,
  id: number,
  iatSeconds: number,
): Promise<boolean> {
  const revokedAfter = await redisOperations.get(`${PRINCIPAL_PREFIX}${kind}:${id}`);
  if (revokedAfter === null || revokedAfter === undefined) return false;
  // Tokens issued in the same second as the revocation are also rejected
  return iatSeconds <= Number(revokedAfter);
}
