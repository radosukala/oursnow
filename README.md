# OURS — a very small thing to own

A button whose colour belongs to the people who voted on it. The person who
made it gets one vote, the same as everyone else, and cannot overrule the
count.

It is deliberately the smallest possible instance of a larger argument.
Software is now cheap to make and the people using it are the only scarce
thing left, yet every application still treats its users as the asset. This
one is an attempt at the inverse, small enough to try in a few seconds: you
change something real, the change belongs to everyone who voted, and losing
a vote costs you nothing — your place is not the prize.

Deploys to **oursnow.co**.

## Licence — not chosen yet

There is no `LICENSE` file, which means the legal default applies: all
rights reserved. That is not what this project means, and it is written here
rather than left for someone to discover. Choosing one is a real decision
with real consequences, so it is being made deliberately instead of by
whichever file got committed first.

## Status, truthfully

```text
THE VOTE            works — server-authoritative, against Postgres
THE COLOUR          follows the count; a tie holds what it had
JOINING             a choice is what joins you; withdrawing does not remove you
EMAIL               OFF until DATA_CONTROLLER names someone responsible
SUGGESTIONS         not built — how they are handled has to be agreed first
MEMBERSHIP          NOT ISSUED. Nothing has been given to anybody
DEPLOYED            not yet
```

Nothing has been issued to anyone. There is no company holding this, no
shares, no tokens, no money. The `/deal` page says so in its own words, and
it is the honest state rather than a disclaimer.

## Run it

```bash
cp .env.example .env.local     # then fill in DATABASE_URL and SESSION_SECRET
createdb oursnow_dev
npm install
npm run db:migrate
npm run dev
```

## Check it

```bash
npm run check:colour
```

Eighteen assertions against a real Postgres, covering the cases where a
wrong answer would matter: forty concurrent voters, changing your mind,
withdrawing, a tie, and an empty tally. It found a genuine defect the first
time it ran — on an empty database the shared row did not exist yet, so
`SELECT … FOR UPDATE` locked nothing and simultaneous first votes were not
serialised. Fixed in `src/lib/colour.ts`; the check is what would catch it
coming back.

```bash
npm run check       # typecheck + lint
npm run build
```

## How it works

**The count is the mechanism.** Every participant holds at most one colour
preference. Changing your mind replaces that row; it never adds a second
vote. Withdrawing deletes the preference and leaves the participant, because
losing or withdrawing a vote is not supposed to remove anybody from
anything.

**One shared colour.** The committed colour lives in `app_state`, not in
anyone's browser. Every write takes a row lock on it before recomputing, so
two simultaneous votes cannot produce two different winners. A tie keeps the
colour it already had, and an empty tally keeps it too — the opening colour
is a disclosed configuration value, not a vote by anybody, and the page says
that while the tally is empty.

**Identity is a signed cookie**, minted at the moment somebody first chooses.
Nothing is stored about a visitor who only looked. It counts browsers, not
people; that is a real limit and the app does not pretend otherwise.

**`colour_events`** records why the colour moved. It is never served
publicly with a participant attached: the public answer is the count.

## Layout

```text
src/app/            the pages — the flow, /deal, /builders, /next
src/app/actions.ts  the server actions; every one returns server truth
src/lib/colour.ts   the tally, the lock, the committed colour
src/lib/participant.ts  the signed cookie
src/db/             schema and pool
scripts/            the correctness checks
```

## Decisions this app is waiting on

These are not configuration conveniences. Each is a human decision, and the
code refuses to guess:

| Variable | Blocks | Why it is not a default |
|---|---|---|
| `DATA_CONTROLLER` | the email step | whoever is named is answerable for every address stored. Blank means the feature stays off rather than addresses quietly accumulating under nobody's name |
| `OPENING_COLOUR` | nothing | disclosed on the page as a default, never presented as a vote |
| `SESSION_SECRET` | everything | rotating it signs every participant out, which is a real event |

Beyond the environment: what membership actually gives people, how
suggestions are moderated, and the licence are all still open, and the
pages say so where a visitor would otherwise assume.
