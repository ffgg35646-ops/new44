import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "ark_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

type AdminSessionPayload = {
  username: string;
  role: "admin";
  issuedAt: number;
  expiresAt: number;
};

type CredentialResult = "valid" | "invalid" | "unconfigured";

function getSessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) return null;
  return secret;
}

export function isAdminConfigurationReady(): boolean {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  return Boolean(username?.trim() && password && password.length >= 12 && getSessionSecret());
}

function constantTimeEqual(actual: string, expected: string): boolean {
  const a = Buffer.from(actual, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyAdminCredentials(username: string, password: string): CredentialResult {
  if (!isAdminConfigurationReady()) return "unconfigured";
  const usernameMatches = constantTimeEqual(username, process.env.ADMIN_USERNAME!);
  const passwordMatches = constantTimeEqual(password, process.env.ADMIN_PASSWORD!);
  return usernameMatches && passwordMatches ? "valid" : "invalid";
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSessionToken(): string | null {
  const secret = getSessionSecret();
  const username = process.env.ADMIN_USERNAME;
  if (!secret || !username || !isAdminConfigurationReady()) return null;
  const now = Date.now();
  const payload: AdminSessionPayload = {
    username, role: "admin", issuedAt: now,
    expiresAt: now + ADMIN_SESSION_TTL_SECONDS * 1000
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return encoded + "." + sign(encoded, secret);
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  const secret = getSessionSecret();
  const expectedUsername = process.env.ADMIN_USERNAME;
  if (!secret || !expectedUsername || !token || token.length > 2048) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const encoded = parts[0];
  if (!constantTimeEqual(parts[1], sign(encoded, secret))) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<AdminSessionPayload>;
    const now = Date.now();
    return payload.role === "admin" &&
      payload.username === expectedUsername &&
      typeof payload.issuedAt === "number" &&
      typeof payload.expiresAt === "number" &&
      payload.issuedAt <= now + 60_000 &&
      payload.expiresAt > now &&
      payload.expiresAt - payload.issuedAt <= ADMIN_SESSION_TTL_SECONDS * 1000;
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value);
}
