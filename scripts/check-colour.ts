/**
 * The behaviour that can actually go wrong, checked against a real Postgres.
 *
 * Not a UI test. These are the cases where a wrong answer would mean two
 * people see two different buttons, or one person's vote counts twice:
 *
 *   1. concurrent voters — every vote lands, the tally is exact
 *   2. changing your mind replaces, never adds
 *   3. withdrawing removes the vote and keeps the person
 *   4. a tie holds the colour it already had, the same way for everybody
 *   5. an empty tally keeps the colour rather than inventing one
 *
 * Run against a scratch database:  npm run check:colour
 * (the env file is loaded by the runner, before these imports resolve)
 */
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "../src/db";
import { setPreference, readState } from "../src/lib/colour";
import { confirmEmail, forgetEmail, heldEmail } from "../src/lib/email";
import {
  appState,
  colourEvents,
  colourPreferences,
  emailConfirmations,
  participants,
} from "../src/db/schema";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ok    ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function reset() {
  await db.delete(emailConfirmations);
  await db.delete(colourEvents);
  await db.delete(colourPreferences);
  await db.delete(participants);
  await db.delete(appState);
}

async function main() {
  if (!process.env.DATABASE_URL?.includes("oursnow_dev")) {
    throw new Error(
      "Refusing to run: this deletes every row. Point DATABASE_URL at oursnow_dev.",
    );
  }

  console.log("\nconcurrent voters");
  await reset();
  const ids = Array.from({ length: 40 }, () => ulid());
  await Promise.all(
    ids.map((id, i) => setPreference(id, i % 2 === 0 ? "blue" : "red")),
  );
  let state = await readState(null);
  check("every vote landed", state.blue + state.red === 40, `got ${state.blue}+${state.red}`);
  check("split is exact", state.blue === 20 && state.red === 20, `${state.blue}/${state.red}`);
  const events = await db.select().from(colourEvents);
  check("one event per vote", events.length === 40, `got ${events.length}`);
  const revisions = new Set(events.map((e) => e.revisionAfter));
  check(
    "no two votes shared a revision",
    revisions.size === 40,
    `${revisions.size} distinct of 40`,
  );

  console.log("\nchanging your mind");
  await reset();
  const me = ulid();
  await setPreference(me, "blue");
  await setPreference(me, "red");
  await setPreference(me, "red");
  state = await readState(me);
  check("one person is still one vote", state.blue + state.red === 1, `${state.blue}+${state.red}`);
  check("the vote is the latest choice", state.red === 1 && state.mine === "red");
  const rows = await db.select().from(colourPreferences);
  check("one preference row", rows.length === 1, `got ${rows.length}`);

  console.log("\nwithdrawing");
  await setPreference(me, null);
  state = await readState(me);
  check("the vote is gone", state.blue + state.red === 0);
  check("the person is not", state.joined === true);
  check("the colour is kept, not invented", state.committed === "red");
  const people = await db.select().from(participants);
  check("participant row survives", people.length === 1, `got ${people.length}`);

  console.log("\na tie");
  await reset();
  const a = ulid(), b = ulid(), c = ulid();
  await setPreference(a, "blue");
  await setPreference(b, "blue");
  await setPreference(c, "red");
  state = await readState(null);
  check("majority wins", state.committed === "blue", state.committed);
  await setPreference(b, null); // 1 blue, 1 red
  state = await readState(null);
  check("a tie holds the previous colour", state.committed === "blue", state.committed);
  await setPreference(a, "red"); // 0 blue, 2 red
  state = await readState(null);
  check("the majority flips it", state.committed === "red", state.committed);

  console.log("\nan empty tally");
  await setPreference(c, null);
  await setPreference(a, null);
  state = await readState(null);
  check("nothing is invented", state.blue + state.red === 0);
  check("the last committed colour stands", state.committed === "red", state.committed);
  check("the page can say it is empty", state.opening === true);

  console.log("\nattaching an address");
  await reset();
  const voter = ulid();
  await setPreference(voter, "blue");

  // What requestEmail writes before anything is sent. The address is
  // deliberately NOT on the participant yet.
  const token = randomBytes(32).toString("base64url");
  await db.insert(emailConfirmations).values({
    id: ulid(),
    participantId: voter,
    email: "someone@example.com",
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + 60 * 60_000),
  });
  check("an unconfirmed address is not held", (await heldEmail(voter)) === null);

  const wrong = await confirmEmail(randomBytes(32).toString("base64url"));
  check("a token we never issued is refused", wrong.ok === false);
  check("and it did not attach anything", (await heldEmail(voter)) === null);

  const good = await confirmEmail(token);
  check("the real link attaches the address", good.ok === true);
  check(
    "and the participant now holds it",
    (await heldEmail(voter)) === "someone@example.com",
  );

  const again = await confirmEmail(token);
  check("the same link cannot be used twice", again.ok === false);
  const leftover = await db.select().from(emailConfirmations);
  check("no pending row survives confirmation", leftover.length === 0, `${leftover.length} left`);

  const expiredToken = randomBytes(32).toString("base64url");
  await db.insert(emailConfirmations).values({
    id: ulid(),
    participantId: voter,
    email: "later@example.com",
    tokenHash: createHash("sha256").update(expiredToken).digest("hex"),
    expiresAt: new Date(Date.now() - 1000),
  });
  const stale = await confirmEmail(expiredToken);
  check("an expired link is refused", stale.ok === false);
  check(
    "and does not replace the held address",
    (await heldEmail(voter)) === "someone@example.com",
  );

  await forgetEmail(voter);
  check("taking it back removes the address", (await heldEmail(voter)) === null);
  const stillThere = await db
    .select()
    .from(participants)
    .where(eq(participants.id, voter));
  check("but not the participant", stillThere.length === 1);
  const stateAfter = await readState(voter);
  check("and not their vote", stateAfter.mine === "blue");

  await reset();
  console.log(
    failures === 0
      ? "\nAll checks passed.\n"
      : `\n${failures} check(s) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
