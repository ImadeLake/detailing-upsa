import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "auth";
const ALG = "HS256";

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export const AUTH_COOKIE = COOKIE_NAME;

export async function createAuthToken(): Promise<string> {
  return await new SignJWT({ ok: true })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyAuthToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret(), { algorithms: [ALG] });
    return true;
  } catch {
    return false;
  }
}

export function checkPin(input: string): boolean {
  const pin = process.env.APP_PIN;
  if (!pin) throw new Error("APP_PIN is not set");
  return input.trim() === pin;
}
