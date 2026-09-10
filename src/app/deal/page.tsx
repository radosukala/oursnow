import type { Metadata } from "next";
import Link from "next/link";
import { DATA_CONTROLLER } from "@/lib/config";

export const metadata: Metadata = {
  title: "The deal — OURS",
  description: "One vote each, including the person who made it. All of it fits on one screen.",
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
        {DATA_CONTROLLER
          ? `Your colour, and your email if you leave one. ${DATA_CONTROLLER} is responsible for it. We write only when something you own is being decided, and one click deletes it.`
          : "Your colour, and a signed cookie so the app knows which vote is yours. No name, no email, nothing else — we are not collecting addresses until somebody is named as responsible for them."}
      </p>

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
