import type { Metadata } from "next";
import Link from "next/link";
import {
  DATA_CONTROLLER,
  DATA_CONTROLLER_EMAIL,
  EMAIL_ENABLED,
} from "@/lib/config";

export const metadata: Metadata = {
  title: "The deal — OURS",
  description:
    "One vote each, including the person who made it. All of it fits on one screen.",
};

export const dynamic = "force-dynamic";

export default function Deal() {
  return (
    <article className="detail">
      <h1>The deal.</h1>

      <p>
        <strong>One vote each.</strong> The person who made this gets the same
        say as you, and no veto. Losing a vote changes nothing about your place
        here.
      </p>

      <p>
        <strong>What’s yours.</strong> A say in what this becomes, equal to
        everyone else’s. Not shares, not tokens, not money — none of those exist
        here, and nobody is selling them.
      </p>

      <p>
        <strong>What we hold.</strong>{" "}
        {EMAIL_ENABLED ? (
          <>
            Your colour, a signed cookie so the app knows which vote is yours,
            and your email if you give one. Nothing else — no name, no location,
            no tracking, no advertising, and nothing bought or sold.
          </>
        ) : (
          <>
            Your colour, and a signed cookie so the app knows which vote is
            yours. No name, no email, nothing else — we are not collecting
            addresses, because nobody has been named as responsible for them.
          </>
        )}
      </p>

      {EMAIL_ENABLED ? (
        <>
          <p>
            <strong>The email, exactly.</strong> It does one job: it makes the
            vote yours rather than this browser’s. We send one link to check the
            address is really yours, and until you follow it nothing is kept.
            After that we write only when something you own is being decided.
            No newsletter, no marketing, nobody else gets it. One click on the
            button page deletes it, and we keep no copy.
          </p>

          <p>
            <strong>Who is responsible for it.</strong> {DATA_CONTROLLER}.
            Write to{" "}
            <a href={`mailto:${DATA_CONTROLLER_EMAIL}`}>
              {DATA_CONTROLLER_EMAIL}
            </a>{" "}
            to see what is held about you, correct it, take it elsewhere, or
            have it erased. You can also complain to your national data
            protection authority; in Czechia that is the Úřad pro ochranu
            osobních údajů.
          </p>
        </>
      ) : null}

      <p>
        <strong>How real it is today.</strong> A proposal. Nothing has been
        issued to anyone yet, there is no company holding this, and no court
        would enforce a word of it. What would make it real is written down, and
        it is itself something you get a say in.
      </p>

      <p>
        <strong>Leaving.</strong> Withdrawing a vote does not remove you.
        Leaving does, and your data goes with you.
      </p>

      <p>
        <strong>What can still happen.</strong> One person runs the machine that
        counts. He has one vote, the same as yours, and cannot overrule you —
        only switch the whole thing off. The day that changes, this paragraph
        changes.
      </p>

      <p className="caption">
        That is all of it. It is short because that is how long it takes.
      </p>

      <Link href="/" className="link">
        Back to the button
      </Link>
    </article>
  );
}
