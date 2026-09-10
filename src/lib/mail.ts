import { Resend } from "resend";
import { MAIL_FROM, RESEND_API_KEY, DATA_CONTROLLER } from "./config";

/**
 * One kind of message is sent from here, and it is the one the person just
 * asked for. Plain text, no tracking pixel, no open or click tracking, no
 * template — the promise on `/deal` is that we write only when something
 * they own is being decided, and a confirmation nobody asked for would be
 * the first thing to break it.
 */
export async function sendConfirmation(
  to: string,
  link: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!RESEND_API_KEY || !MAIL_FROM) {
    return { ok: false, message: "Mail is not configured." };
  }

  const body = [
    "Somebody — we hope you — asked to attach this address to a vote on oursnow.co.",
    "",
    "Open this link to confirm it:",
    link,
    "",
    "The link works once and expires in an hour.",
    "",
    "If it was not you, ignore this. Nothing is stored against your address",
    "unless the link is followed, and you will not hear from us again.",
    "",
    DATA_CONTROLLER
      ? `Held by ${DATA_CONTROLLER}. We write only when something you own is being decided.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const resend = new Resend(RESEND_API_KEY);
    const result = await resend.emails.send({
      from: MAIL_FROM,
      to,
      subject: "Confirm your address on oursnow.co",
      text: body,
    });
    if (result.error) {
      console.error("[oursnow] resend refused the message:", result.error);
      return {
        ok: false,
        message: "The confirmation could not be sent. Try again shortly.",
      };
    }
    return { ok: true };
  } catch (error) {
    console.error("[oursnow] sending the confirmation failed:", error);
    return {
      ok: false,
      message: "The confirmation could not be sent. Try again shortly.",
    };
  }
}
