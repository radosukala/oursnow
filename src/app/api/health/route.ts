import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * What is wrong, in one request.
 *
 * A server-rendered page that cannot reach its database gives the visitor a
 * blank 500 and the operator a production stack trace with the message
 * stripped out. This says which of the handful of possible causes it
 * actually is.
 *
 * It reports whether values are present, never what they are, and it
 * imports the database lazily so that a broken configuration cannot take
 * this route down with it.
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    sessionSecret:
      Boolean(process.env.SESSION_SECRET) &&
      (process.env.SESSION_SECRET?.length ?? 0) >= 16,
    openingColour: process.env.OPENING_COLOUR ?? "(unset, defaults to blue)",
    nodeEnv: process.env.NODE_ENV ?? null,
  };

  // The email step needs all four; say which are missing rather than just
  // reporting that it is off.
  const emailMissing = [
    ["DATA_CONTROLLER", process.env.DATA_CONTROLLER],
    ["DATA_CONTROLLER_EMAIL", process.env.DATA_CONTROLLER_EMAIL],
    ["RESEND_API_KEY", process.env.RESEND_API_KEY],
    ["MAIL_FROM", process.env.MAIL_FROM],
  ]
    .filter(([, value]) => !(typeof value === "string" && value.trim()))
    .map(([name]) => name);
  checks.emailEnabled = emailMissing.length === 0;
  if (emailMissing.length > 0) checks.emailMissing = emailMissing;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        problem: "DATABASE_URL is not set on this deployment.",
        fix: "Add it in the hosting project's environment variables, for Production, then redeploy. Environment changes do not apply to an existing build.",
        checks,
      },
      { status: 503 },
    );
  }

  try {
    const { db } = await import("@/db");
    const { sql } = await import("drizzle-orm");

    await db.execute(sql`select 1`);
    checks.databaseReachable = true;

    const tables = await db.execute<{ present: string | null }>(
      sql`select to_regclass('public.app_state')::text as present`,
    );
    const migrated = tables.rows[0]?.present !== null;
    checks.migrationsApplied = migrated;

    if (!migrated) {
      return NextResponse.json(
        {
          ok: false,
          problem:
            "The database is reachable but its tables do not exist. The migration has not been run against it.",
          fix: 'Run: DATABASE_URL="<production url>" npx drizzle-kit migrate',
          checks,
        },
        { status: 503 },
      );
    }

    const counts = await db.execute<{ participants: number; votes: number }>(
      sql`select
            (select count(*)::int from participants) as participants,
            (select count(*)::int from colour_preferences) as votes`,
    );
    checks.participants = counts.rows[0]?.participants ?? 0;
    checks.votes = counts.rows[0]?.votes ?? 0;

    return NextResponse.json({ ok: true, checks });
  } catch (error) {
    const { problem, fix } = diagnose(error);
    return NextResponse.json({ ok: false, problem, fix, checks }, { status: 503 });
  }
}

/**
 * Turn a driver failure into the one sentence that identifies it.
 *
 * Deliberately reports the error *code* and never the driver's message.
 * The message often contains the host it failed to reach, and this route is
 * public. The codes below are enough to tell a wrong password from a wrong
 * host from a missing table, which is the whole job.
 */
function diagnose(error: unknown): { problem: string; fix: string } {
  // Drizzle wraps the driver error, so the useful one is further down.
  let code: string | undefined;
  let cursor: unknown = error;
  for (let depth = 0; depth < 5 && cursor; depth += 1) {
    const candidate = (cursor as { code?: unknown }).code;
    if (typeof candidate === "string") code = candidate;
    cursor = (cursor as { cause?: unknown }).cause;
  }

  switch (code) {
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return {
        problem: "The database host in DATABASE_URL does not resolve.",
        fix: "Check the host in the connection string. Copy the pooled string again from the database provider.",
      };
    case "ECONNREFUSED":
      return {
        problem: "Nothing is accepting connections at that host and port.",
        fix: "Check the port, and that the database is not suspended.",
      };
    case "ETIMEDOUT":
    case "ECONNRESET":
      return {
        problem: "The connection timed out.",
        fix: "Usually the hosting region cannot reach the database, or an IP allow-list is blocking it.",
      };
    case "28P01":
      return {
        problem: "The password in DATABASE_URL was rejected.",
        fix: "Reset the database password and paste the whole connection string again — a partial copy is the usual cause.",
      };
    case "28000":
      return {
        problem: "The database refused that role.",
        fix: "Check the username in the connection string.",
      };
    case "3D000":
      return {
        problem: "That database name does not exist on the server.",
        fix: "Check the path at the end of the connection string.",
      };
    case "42P01":
      return {
        problem: "A table is missing. The migration has not been run against this database.",
        fix: 'Run: DATABASE_URL="<production url>" npx drizzle-kit migrate',
      };
    case "SELF_SIGNED_CERT_IN_CHAIN":
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
      return {
        problem: "The database's TLS certificate could not be verified.",
        fix: "The app requires a verifiable certificate. Use the provider's own hostname rather than an IP address or a proxy.",
      };
    default:
      return {
        problem: `The database could not be reached${code ? ` (${code})` : ""}.`,
        fix: "Check that the connection string is the pooled one, that the database is awake, and that the hosting region can reach it.",
      };
  }
}
