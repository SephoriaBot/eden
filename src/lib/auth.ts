import { verifyToken } from "@clerk/backend";
import type { VercelRequest } from "@vercel/node";

// Demo visitors get a random "guest_<32 hex>" id from the browser. It can never collide
// with a Clerk id ("user_..."), and being random it works like a private key to that
// guest's own data.
const GUEST_RE = /^guest_[0-9a-f]{32}$/;

export function isGuestId(id: string | null | undefined): id is string {
  return !!id && GUEST_RE.test(id);
}

// Returns the signed-in user's ID (or a demo guest's ID), or null if the request isn't authenticated.
export async function getUserId(req: VercelRequest): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;

  const token = header.slice(7);
  if (isGuestId(token)) return token;

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
