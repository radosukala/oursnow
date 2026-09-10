import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What should it do? — OURS",
  description: "It’s a button. For now.",
};

export default function WhatNext() {
  return (
    <article className="detail">
      <h1>
        It’s a button.
        <br />
        For now.
      </h1>

      <p>
        The colour is settled by counting. What the button should actually do is
        a bigger question, and it needs something the colour did not: a way to
        put an idea in front of everybody without the loudest person deciding
        what gets read.
      </p>

      <p>
        So the box where you would type an idea is not here yet. How suggestions
        are handled — who can post, what happens to abuse, how one gets chosen —
        is the next thing to agree, and agreeing it in private and announcing it
        afterwards would be the wrong start.
      </p>

      <p className="caption">
        Nothing is being collected on this page. When the suggestion box opens,
        it opens because there was a vote about how it works.
      </p>

      <Link href="/" className="link">
        Back to the button
      </Link>
    </article>
  );
}
