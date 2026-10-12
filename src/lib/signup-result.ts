export type SignupNotice = { email: string; kind: "confirmation" | "confirmed" | "unverified" };

/** Auth can return an obfuscated existing user; never promise a new welcome for that response. */
export function signupNoticeFor(
  email: string,
  result: {
    error: unknown;
    data: { user: { identities?: unknown[] } | null; session: unknown | null };
  },
): SignupNotice | null {
  if (result.error) return null;
  const { user, session } = result.data;
  if (!user || !user.identities?.length) return { email, kind: "unverified" };
  return { email, kind: session ? "confirmed" : "confirmation" };
}