import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";

/**
 * A person who has joined by making a choice.
 *
 * Joining and holding a colour preference are deliberately separate rows.
 * Withdrawing a preference removes the row in `colourPreferences`; it does
 * not touch this one, because losing or withdrawing a vote is not supposed
 * to remove anybody from anything.
 *
 * `email` is nullable and stays null unless the participant chooses to
 * attach one, and unless DATA_CONTROLLER names who is responsible for it.
 */
export const participants = pgTable("participants", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  emailAddedAt: timestamp("email_added_at", { withTimezone: true }),
  joinedAt: timestamp("joined_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  /** Set when somebody leaves for good. Leaving is not withdrawing a vote. */
  leftAt: timestamp("left_at", { withTimezone: true }),
});

/**
 * The current colour preference of one participant. At most one row each:
 * changing your mind replaces this row rather than adding a second vote.
 * Withdrawing deletes it, and the participant stays.
 */
export const colourPreferences = pgTable("colour_preferences", {
  participantId: text("participant_id")
    .primaryKey()
    .references(() => participants.id, { onDelete: "cascade" }),
  choice: text("choice").notNull(), // 'blue' | 'red'
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Shared state that every browser must agree on. Today one row:
 * `committed_colour`.
 *
 * It exists because a tie has to resolve the same way for everybody. If each
 * browser remembered its own previous winner, two people would see two
 * different buttons and both would be right, which is the one thing this
 * app cannot afford. `revision` increments on every recomputation so a
 * client can tell whether what it is looking at is current.
 */
export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  revision: integer("revision").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Why the colour is what it is, in order.
 *
 * Kept so the state can be explained rather than merely asserted. It records
 * that a preference moved and what the tally became, and it is never served
 * publicly with the participant attached: the public answer is the count,
 * and who voted which way is not the public's business.
 */
export const colourEvents = pgTable(
  "colour_events",
  {
    id: text("id").primaryKey(),
    participantId: text("participant_id"),
    fromChoice: text("from_choice"), // null when the participant had none
    toChoice: text("to_choice"), // null when the preference was withdrawn
    blueAfter: integer("blue_after").notNull(),
    redAfter: integer("red_after").notNull(),
    committedAfter: text("committed_after").notNull(),
    revisionAfter: integer("revision_after").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("colour_events_at_idx").on(t.at)],
);

/**
 * An address somebody has asked us to attach, waiting for them to prove it
 * is theirs.
 *
 * The address is not written to `participants` until a link sent to it is
 * followed. Anyone can type anyone's address into a box; storing it before
 * it is confirmed would mean holding the personal data of somebody who
 * never asked to be here, and it would make the address useless for the one
 * job it has — proving a share is yours later.
 *
 * Only a hash of the token is stored. The token itself exists in the email
 * and nowhere else, so this table cannot be used to authorise anything.
 * Rows expire, and are deleted on confirmation.
 */
export const emailConfirmations = pgTable(
  "email_confirmations",
  {
    id: text("id").primaryKey(),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("email_confirmations_token_idx").on(t.tokenHash),
    index("email_confirmations_expires_idx").on(t.expiresAt),
  ],
);

export type Participant = typeof participants.$inferSelect;
export type ColourPreference = typeof colourPreferences.$inferSelect;
export type ColourEvent = typeof colourEvents.$inferSelect;
export type EmailConfirmation = typeof emailConfirmations.$inferSelect;
