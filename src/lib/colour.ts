import { sql, eq } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "@/db";
import {
  appState,
  colourEvents,
  colourPreferences,
  participants,
} from "@/db/schema";
import { OPENING_COLOUR, type Colour } from "./config";

const COMMITTED_KEY = "committed_colour";

export type State = {
  blue: number;
  red: number;
  /** The colour the button is actually showing. */
  committed: Colour;
  revision: number;
  /** null when this visitor has no preference, or has withdrawn it. */
  mine: Colour | null;
  /** false until the visitor has chosen at least once. */
  joined: boolean;
  /** true while nobody has voted, so the page can say the colour is a default. */
  opening: boolean;
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function tally(tx: Tx): Promise<{ blue: number; red: number }> {
  const rows = await tx
    .select({
      choice: colourPreferences.choice,
      n: sql<number>`count(*)::int`,
    })
    .from(colourPreferences)
    .groupBy(colourPreferences.choice);
  let blue = 0;
  let red = 0;
  for (const row of rows) {
    if (row.choice === "blue") blue = row.n;
    else if (row.choice === "red") red = row.n;
  }
  return { blue, red };
}

/**
 * Read and lock the shared colour row, creating it on first use.
 *
 * Every write path goes through this lock, which is what stops two
 * simultaneous votes from computing the tally against different snapshots
 * and writing two different winners.
 *
 * The loop matters. `for update` on a row that does not exist yet locks
 * nothing, so on an empty database several first votes would sail past each
 * other, all read a tally missing the others, and all claim the same
 * revision. So: if the row is not there, create it — the insert blocks
 * against anybody else creating it — and go round once more to take the
 * lock properly. Two passes are always enough, because after the first the
 * row exists for good.
 */
async function lockCommitted(
  tx: Tx,
): Promise<{ value: Colour; revision: number }> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const locked = await tx.execute(
      sql`select value, revision from app_state where key = ${COMMITTED_KEY} for update`,
    );
    const row = locked.rows[0] as
      | { value: string; revision: number }
      | undefined;
    if (row) {
      return {
        value: row.value === "red" ? "red" : "blue",
        revision: Number(row.revision),
      };
    }
    await tx
      .insert(appState)
      .values({ key: COMMITTED_KEY, value: OPENING_COLOUR, revision: 0 })
      .onConflictDoNothing();
  }
  throw new Error(
    "Could not take the colour lock. The shared colour row is missing and could not be created.",
  );
}

/** Whoever has more preferences wins; a tie changes nothing. */
function decide(
  blue: number,
  red: number,
  current: Colour,
): Colour {
  if (blue > red) return "blue";
  if (red > blue) return "red";
  return current;
}

/** The state as it stands, without changing anything. */
export async function readState(participantId: string | null): Promise<State> {
  const [counts, committedRows, mineRows, joinedRows] = await Promise.all([
    db
      .select({
        choice: colourPreferences.choice,
        n: sql<number>`count(*)::int`,
      })
      .from(colourPreferences)
      .groupBy(colourPreferences.choice),
    db.select().from(appState).where(eq(appState.key, COMMITTED_KEY)).limit(1),
    participantId
      ? db
          .select({ choice: colourPreferences.choice })
          .from(colourPreferences)
          .where(eq(colourPreferences.participantId, participantId))
          .limit(1)
      : Promise.resolve([]),
    participantId
      ? db
          .select({ id: participants.id })
          .from(participants)
          .where(eq(participants.id, participantId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  let blue = 0;
  let red = 0;
  for (const row of counts) {
    if (row.choice === "blue") blue = row.n;
    else if (row.choice === "red") red = row.n;
  }

  const stored = committedRows[0];
  const committed: Colour =
    stored?.value === "red" ? "red" : stored?.value === "blue" ? "blue" : OPENING_COLOUR;
  const mine = mineRows[0]?.choice;

  return {
    blue,
    red,
    committed,
    revision: stored?.revision ?? 0,
    mine: mine === "blue" || mine === "red" ? mine : null,
    joined: joinedRows.length > 0,
    opening: blue + red === 0,
  };
}

/**
 * Record a choice, or withdraw one when `choice` is null.
 *
 * Replacing a preference never adds a second vote, and withdrawing never
 * removes the participant. Both facts live in the shape of the tables; this
 * function is just the part that recomputes the shared colour afterwards
 * and writes down why it moved.
 */
export async function setPreference(
  participantId: string,
  choice: Colour | null,
): Promise<State> {
  return db.transaction(async (tx) => {
    const current = await lockCommitted(tx);

    await tx
      .insert(participants)
      .values({ id: participantId })
      .onConflictDoNothing();

    const before = await tx
      .select({ choice: colourPreferences.choice })
      .from(colourPreferences)
      .where(eq(colourPreferences.participantId, participantId))
      .limit(1);
    const fromChoice = before[0]?.choice ?? null;

    if (choice === null) {
      await tx
        .delete(colourPreferences)
        .where(eq(colourPreferences.participantId, participantId));
    } else {
      await tx
        .insert(colourPreferences)
        .values({ participantId, choice })
        .onConflictDoUpdate({
          target: colourPreferences.participantId,
          set: { choice, updatedAt: new Date() },
        });
    }

    const { blue, red } = await tally(tx);
    const committed = decide(blue, red, current.value);
    const revision = current.revision + 1;

    await tx
      .update(appState)
      .set({ value: committed, revision, updatedAt: new Date() })
      .where(eq(appState.key, COMMITTED_KEY));

    await tx.insert(colourEvents).values({
      id: ulid(),
      participantId,
      fromChoice,
      toChoice: choice,
      blueAfter: blue,
      redAfter: red,
      committedAfter: committed,
      revisionAfter: revision,
    });

    return {
      blue,
      red,
      committed,
      revision,
      mine: choice,
      joined: true,
      opening: blue + red === 0,
    };
  });
}
