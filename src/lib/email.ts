import { randomBytes, createHash } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "@/db";
import { emailConfirmations, participants } from "@/db/schema";
import { SITE_URL } from "./config";
import { sendConfirmation } from "./mail";

const TTL_MINUTES = 60;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Ask for an address, and prove it before keeping it.
 *
 * The row written here is a pending request, not a held address: the
 * participant's own record is untouched until the link is followed. That
 * keeps two promises at once — that we hold nothing about somebody who
 * never asked to be here, and that an address, once held, is one that
 * somebody actually reached.
 */
export async function requestEmail(
  participantId: string,
  rawEmail: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { ok: false, message: "That does not look like an email address." };
  }

  // Anything expired is of no use to anybody; drop it while we are here.
  await db
    .delete(emailConfirmations)
    .where(lt(emailConfirmations.expiresAt, new Date()));

  const taken = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.email, email))
    .limit(1);
  if (taken.length > 0 && taken[0].id !== participantId) {
    return {
      ok: false,
      message: "That address is already attached to a different vote.",
    };
  }

  // One pending request per person, so a second attempt replaces the first
  // rather than leaving two live links.
  await db
    .delete(emailConfirmations)
    .where(eq(emailConfirmations.participantId, participantId));

  const token = randomBytes(32).toString("base64url");
  await db.insert(emailConfirmations).values({
    id: ulid(),
    participantId,
    email,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
  });

  // The token travels in the fragment, which a browser never sends to the
  // server. A scanner that fetches the link — corporate mail filters do
  // this routinely — loads a page and confirms nothing; only the person
  // whose browser runs the page can complete it.
  const sent = await sendConfirmation(email, `${SITE_URL}/confirm#${token}`);
  if (!sent.ok) {
    await db
      .delete(emailConfirmations)
      .where(eq(emailConfirmations.participantId, participantId));
    return sent;
  }
  return { ok: true };
}

/** Follow the link. Single use, and the pending row goes with it. */
export async function confirmEmail(
  token: string,
): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  if (!token || token.length > 200) {
    return { ok: false, message: "That link is not valid." };
  }

  const rows = await db
    .select()
    .from(emailConfirmations)
    .where(eq(emailConfirmations.tokenHash, hash(token)))
    .limit(1);
  const pending = rows[0];

  if (!pending || pending.expiresAt.getTime() < Date.now()) {
    if (pending) {
      await db
        .delete(emailConfirmations)
        .where(eq(emailConfirmations.id, pending.id));
    }
    return {
      ok: false,
      message:
        "That link has expired or has already been used. Ask for a new one from the button page.",
    };
  }

  try {
    await db
      .update(participants)
      .set({ email: pending.email, emailAddedAt: new Date() })
      .where(eq(participants.id, pending.participantId));
  } catch (error) {
    console.error("[oursnow] attaching a confirmed address failed:", error);
    return {
      ok: false,
      message: "That address is already attached to a different vote.",
    };
  } finally {
    await db
      .delete(emailConfirmations)
      .where(eq(emailConfirmations.id, pending.id));
  }

  return { ok: true, email: pending.email };
}

/** Take the address back. One action, no questions, nothing retained. */
export async function forgetEmail(participantId: string): Promise<void> {
  await db
    .update(participants)
    .set({ email: null, emailAddedAt: null })
    .where(eq(participants.id, participantId));
  await db
    .delete(emailConfirmations)
    .where(eq(emailConfirmations.participantId, participantId));
}

/** The address held for this participant, if any. */
export async function heldEmail(
  participantId: string | null,
): Promise<string | null> {
  if (!participantId) return null;
  const rows = await db
    .select({ email: participants.email })
    .from(participants)
    .where(and(eq(participants.id, participantId)))
    .limit(1);
  return rows[0]?.email ?? null;
}
