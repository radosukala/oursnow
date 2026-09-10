# Deploying to oursnow.co

The app is ready: `npm run build` passes, and `npm run check:colour` passes
against a real Postgres. Everything below needs accounts held by whoever
operates it.

## 1. A database of its own

Make a new Postgres. Do not point this at a database that already holds
another product's accounts: one privacy notice cannot honestly cover two
unrelated purposes, and an app that argues people's data should not live
inside a replaceable application should not begin by moving into someone
else's tables.

```bash
# Neon console → new project → copy the pooled connection string
```

## 2. Environment

Set these in the hosting project, for production and previews:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the pooled connection string |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `OPENING_COLOUR` | `blue` |
| `DATA_CONTROLLER` | **leave unset until it is decided.** The email step stays hidden while it is blank |

`DATA_CONTROLLER` is a decision rather than a setting. Whoever is named
there is answerable for every address the app holds. Until it names
somebody, no addresses are collected and `/deal` says exactly that.

## 3. Migrate

```bash
DATABASE_URL="<production url>" npx drizzle-kit migrate
```

## 4. Host

```bash
npx vercel link
npx vercel --prod
```

No `vercel.json` is needed. The root page is dynamic on purpose — it reads
the count on every request.

## 5. DNS

Add `oursnow.co` in the hosting project's domain settings and follow the
records it gives you. Point `www` at the apex as a redirect.

## 6. Before telling anyone it exists

- [ ] `/deal` reads true against what actually exists that day
- [ ] `DATA_CONTROLLER` decided — named, or the email step stays off
- [ ] `npm run check:colour` run against a scratch copy of the production
      database, never against live rows
- [ ] the first vote cast by somebody who is not the person who built it

The last one is the only launch metric worth watching.
