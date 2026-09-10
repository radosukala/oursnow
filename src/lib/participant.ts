import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ulid } from "ulid";

const COOKIE = "ours_participant";
const MAX_AGE = 60 * 60 * 24 * 365; // a year

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Generate one with: " +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return value;
}

function sign(id: string): string {
  return createHmac("sha256", secret()).update(id).digest("base64url");
}

/**
 * The cookie is the claim; the signature is what makes it a claim we issued.
 * Without this a visitor could type any participant id into their own cookie
 * jar and speak as somebody else.
 */
function verify(raw: string): string | null {
  const cut = raw.lastIndexOf(".");
  if (cut < 1) return null;
  const id = raw.slice(0, cut);
  const given = Buffer.from(raw.slice(cut + 1));
  const expected = Buffer.from(sign(id));
  if (given.length !== expected.length) return null;
  return timingSafeEqual(given, expected) ? id : null;
}

/** The participant this request belongs to, or null for a stranger. */
export async function currentParticipantId(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  return raw ? verify(raw) : null;
}

/**
 * Mint an identity. Called at the moment somebody first chooses a colour,
 * because choosing is what joins you — there is nothing to identify before
 * that, and nothing worth storing about a visitor who only looked.
 */
export async function issueParticipantId(): Promise<string> {
  const id = ulid();
  (await cookies()).set(COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return id;
}

export async function clearParticipantCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
