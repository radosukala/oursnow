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

## Licence

[Apache 2.0](./LICENSE). Take it, run it, change it, run it somewhere else.
Permissive is the consistent choice here rather than a generous one: the
argument this project makes is that the code was never the valuable part, so
locking it down would contradict the pitch. Whoever forks it gets working
code and nobody, and the running instance is worth choosing only for as long
as it deserves to be.

## Status, truthfully

```text
THE VOTE            works — server-authoritative, against Postgres
THE COLOUR          follows the count; a tie holds what it had
JOINING             a choice is what joins you; withdrawing does not remove you
EMAIL               confirmed before it is kept; off unless all four variables are set
SUGGESTIONS         not built — how they are handled has to be agreed first
MEMBERSHIP          NOT ISSUED. Nothing has been given to anybody
DEPLOYED            oursnow.co
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
npm run check:local
```

Thirty assertions against a real Postgres, covering the cases where a wrong
answer would matter: forty concurrent voters, changing your mind,
withdrawing, a tie, an empty tally, and the whole address-confirmation path
— an unconfirmed address is never held, a token we never issued is refused,
a link works once, an expired one does not, and taking an address back
removes it without removing the person or their vote.

It found a genuine defect the first time it ran: on an empty database the
shared row did not exist yet, so `SELECT … FOR UPDATE` locked nothing and
simultaneous first votes were not serialised. Fixed in `src/lib/colour.ts`;
the check is what would catch it coming back.

The script deletes every row, so it refuses to run against anything but the
local scratch database. `check:local` points it there; `check:logic` uses
whatever `DATABASE_URL` is set, and the guard still stands in the way.

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

**An address is proved before it is kept.** Typing one sends a single link
and stores a pending row; the participant's own record is untouched until
the link is followed. Anyone can type anyone's address into a box, and
storing it first would mean holding personal data belonging to somebody who
never asked to be here — and it would make the address useless for the one
job it has, which is proving later that a vote is yours. Only a hash of the
token is stored; the token itself exists in the email and nowhere else. It
travels in the URL fragment, which browsers never send to a server, so a
corporate mail scanner that follows the link confirms nothing.

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
| `DATA_CONTROLLER_EMAIL` | the email step | a controller nobody can write to is not a contact. It is where people exercise the rights `/deal` promises |
| `RESEND_API_KEY`, `MAIL_FROM` | the email step | without a way to send the link there is no way to prove an address, and an unproved address is worse than none |
| `OPENING_COLOUR` | nothing | disclosed on the page as a default, never presented as a vote |
| `SESSION_SECRET` | everything | rotating it signs every participant out, which is a real event |

Beyond the environment: what membership actually gives people, and how
suggestions are moderated, are still open, and the pages say so where a
visitor would otherwise assume.
