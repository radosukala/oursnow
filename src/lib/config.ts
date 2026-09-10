/** Configuration that is really a decision, kept where it can be read. */

export type Colour = "blue" | "red";

export function isColour(value: unknown): value is Colour {
  return value === "blue" || value === "red";
}

/**
 * The colour shown before anybody has voted.
 *
 * It is a disclosed default and not a vote by anyone. While the tally is
 * empty the page says exactly that, because a button that looks decided
 * when nothing has been decided is the small lie this whole app exists to
 * avoid.
 */
export const OPENING_COLOUR: Colour = isColour(process.env.OPENING_COLOUR)
  ? process.env.OPENING_COLOUR
  : "blue";

/**
 * Who is legally responsible for the personal data this holds, and where a
 * person reaches them. Both are shown on `/deal`, because an address you
 * cannot write to is not a contact.
 */
export const DATA_CONTROLLER = process.env.DATA_CONTROLLER?.trim() || null;
export const DATA_CONTROLLER_EMAIL =
  process.env.DATA_CONTROLLER_EMAIL?.trim() || null;

/** Where confirmation mail comes from, and the key that sends it. */
export const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() || null;
export const MAIL_FROM = process.env.MAIL_FROM?.trim() || null;

/**
 * The public address, used to build the link inside a confirmation email.
 * Falls back to what the platform reports so previews confirm against
 * themselves rather than sending people to production.
 */
export const SITE_URL = (
  process.env.SITE_URL?.trim() ||
  (process.env.VERCEL_ENV === "production"
    ? "https://oursnow.co"
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3021")
).replace(/\/$/, "");

/**
 * Whether to offer the email step at all.
 *
 * It needs all four: somebody named as responsible, a way to reach them, a
 * way to send the confirmation, and an address to send it from. Missing any
 * one of those and the box is not rendered, because the alternative is
 * collecting addresses that nobody has claimed responsibility for or that
 * nobody has proved are theirs.
 */
export const EMAIL_ENABLED = Boolean(
  DATA_CONTROLLER && DATA_CONTROLLER_EMAIL && RESEND_API_KEY && MAIL_FROM,
);

/** Which piece is missing, for the health check. Never shown to a visitor. */
export function emailBlockers(): string[] {
  const missing: string[] = [];
  if (!DATA_CONTROLLER) missing.push("DATA_CONTROLLER");
  if (!DATA_CONTROLLER_EMAIL) missing.push("DATA_CONTROLLER_EMAIL");
  if (!RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (!MAIL_FROM) missing.push("MAIL_FROM");
  return missing;
}
