import { createHash, randomBytes } from "node:crypto";

export const GUEST_COOKIE = "mosaic_guest";
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export function hashGuestToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function readGuestToken(cookieHeader = "") {
  for (const part of cookieHeader.split(";")) {
    const [name, value] = part.trim().split("=", 2);
    if (name === GUEST_COOKIE && TOKEN_PATTERN.test(value ?? "")) return value;
  }
  return null;
}

export function guestCookie(token, { secure = false } = {}) {
  if (!TOKEN_PATTERN.test(token)) throw new Error("Invalid guest token");
  return `${GUEST_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}

export function createGuestSessionService(db, { now = () => new Date(), newToken = () => randomBytes(32).toString("hex") } = {}) {
  return {
    async getOrCreate(request, response) {
      const token = readGuestToken(request.headers.cookie);
      if (token) {
        const { data, error } = await db
          .from("guest_sessions")
          .select("id, expires_at")
          .eq("token_hash", hashGuestToken(token))
          .maybeSingle();
        if (error) throw new Error("Could not look up guest session");
        if (data && new Date(data.expires_at) > now()) return data.id;
      }

      const freshToken = newToken();
      if (!TOKEN_PATTERN.test(freshToken)) throw new Error("Invalid generated guest token");
      const expiresAt = new Date(now().getTime() + SESSION_SECONDS * 1000).toISOString();
      const { data, error } = await db
        .from("guest_sessions")
        .insert({ token_hash: hashGuestToken(freshToken), expires_at: expiresAt })
        .select("id")
        .single();
      if (error || !data?.id) throw new Error("Could not create guest session");
      response.setHeader("set-cookie", guestCookie(freshToken, { secure: process.env.NODE_ENV === "production" }));
      return data.id;
    },
  };
}
