import { verifyToken } from "@clerk/backend";
import type { VercelRequest } from "@vercel/node";

// Returns the signed-in user's ID, or null if the request isn't authenticated.
export async function getUserId(req: VercelRequest): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;

  const token = header.slice(7);
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
