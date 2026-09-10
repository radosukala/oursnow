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
 * Who is legally responsible for personal data.
 *
 * The email step is unavailable until this names somebody. That is
 * deliberate: an address the app holds needs a person answerable for it,
 * and leaving this blank should switch the feature off rather than quietly
 * collect addresses nobody has claimed responsibility for.
 */
export const DATA_CONTROLLER: string | null =
  process.env.DATA_CONTROLLER?.trim() || null;

export const EMAIL_ENABLED = DATA_CONTROLLER !== null;
