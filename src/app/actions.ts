"use server";

import { readState, setPreference, type State } from "@/lib/colour";
import {
  currentParticipantId,
  issueParticipantId,
} from "@/lib/participant";
import { isColour } from "@/lib/config";
import { EMAIL_ENABLED } from "@/lib/config";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export type ActionResult =
  | { ok: true; state: State }
  | { ok: false; message: string };

/**
 * Choose a colour, which is also how somebody joins.
 *
 * Every call returns the state the server actually holds, so a client can
 * never end up displaying a vote the database refused.
 */
export async function chooseColour(choice: string): Promise<ActionResult> {
  if (!isColour(choice)) {
    return { ok: false, message: "That is not one of the two colours." };
  }
  try {
    const existing = await currentParticipantId();
    const id = existing ?? (await issueParticipantId());
    const state = await setPreference(id, choice);
    return { ok: true, state };
  } catch (error) {
    console.error("chooseColour failed", error);
    return {
      ok: false,
      message: "That did not reach us. Nothing was recorded — try again.",
    };
  }
}

/** Take back a colour preference. This does not remove anybody. */
export async function withdrawColour(): Promise<ActionResult> {
  try {
    const id = await currentParticipantId();
    if (!id) {
      return { ok: true, state: await readState(null) };
    }
    const state = await setPreference(id, null);
    return { ok: true, state };
  } catch (error) {
    console.error("withdrawColour failed", error);
    return {
      ok: false,
      message: "That did not reach us. Your vote is unchanged — try again.",
    };
  }
}

/** The current state, for a client that wants to be sure it is looking at now. */
export async function refreshState(): Promise<ActionResult> {
  try {
    return { ok: true, state: await readState(await currentParticipantId()) };
  } catch (error) {
    console.error("refreshState failed", error);
    return { ok: false, message: "Could not reach the count." };
  }
}

/**
 * Attach an email so the share survives this browser.
 *
 * Refused outright while no controller is named. Whoever is named in
 * DATA_CONTROLLER is answerable for every address this stores, so an unset
 * value has to mean the feature is off rather than that nobody is
 * responsible.
 */
export async function attachEmail(
  raw: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!EMAIL_ENABLED) {
    return {
      ok: false,
      message:
        "We are not collecting addresses yet. Nobody has been named as responsible for them, so the box is switched off rather than quietly filling up.",
    };
  }
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { ok: false, message: "That does not look like an email address." };
  }
  const id = await currentParticipantId();
  if (!id) {
    return { ok: false, message: "Choose a colour first — that is what joins you." };
  }
  try {
    await db
      .update(participants)
      .set({ email, emailAddedAt: new Date() })
      .where(eq(participants.id, id));
    return { ok: true };
  } catch (error) {
    console.error("attachEmail failed", error);
    return {
      ok: false,
      message:
        "That address is already held by somebody else, or it did not reach us.",
    };
  }
}
