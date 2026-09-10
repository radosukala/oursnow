"use server";

import { readState, setPreference, type State } from "@/lib/colour";
import {
  currentParticipantId,
  issueParticipantId,
} from "@/lib/participant";
import { isColour, EMAIL_ENABLED } from "@/lib/config";
import { confirmEmail, forgetEmail, requestEmail } from "@/lib/email";

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
 * Ask to attach an address. Sends a confirmation; keeps nothing until the
 * link is followed.
 *
 * Refused outright unless somebody is named as responsible for the data and
 * mail can actually be sent. An unset controller has to mean the feature is
 * off, not that nobody is answerable for what is collected.
 */
export async function requestEmailAttachment(
  raw: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!EMAIL_ENABLED) {
    return {
      ok: false,
      message:
        "We are not collecting addresses. Nobody has been named as responsible for them, so the box is switched off rather than quietly filling up.",
    };
  }
  const id = await currentParticipantId();
  if (!id) {
    return {
      ok: false,
      message: "Choose a colour first — that is what joins you.",
    };
  }
  return requestEmail(id, raw);
}

/** Complete the attachment from the link in the email. */
export async function confirmEmailAttachment(
  token: string,
): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  return confirmEmail(token);
}

/** Take the address back. Nothing is kept, and nothing is asked. */
export async function removeEmail(): Promise<{ ok: boolean }> {
  const id = await currentParticipantId();
  if (id) await forgetEmail(id);
  return { ok: true };
}
