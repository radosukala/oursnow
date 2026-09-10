import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For builders — OURS",
  description:
    "Help make software for the people who use it. Your work earns credit. It does not buy a greater say.",
};

export default function Builders() {
  return (
    <article className="detail">
      <h1>
        Build something.
        <br />
        Don’t own everyone.
      </h1>

      <p>
        The deal: help make software for the people who use it. Your work earns
        credit. It does not buy a greater say.
      </p>

      <p>
        Volunteer for a bounded contribution, or agree payment when funding
        exists. Equal standing does not require unpaid work, and nobody here
        will pretend otherwise.
      </p>

      <p>
        The code is open, under a licence that lets anyone take it and run it
        somewhere else. That is deliberate. The code was never the valuable
        part — whoever forks it gets working software and nobody, and this one
        is worth choosing only for as long as it deserves to be.
      </p>

      <p>
        The alternative is the one you already know: build an app, ship it, and
        have nobody come. Or raise money, and still have nobody come.
      </p>

      <p className="caption">
        There is nothing to apply to yet. What gets built, and by whom, is one
        of the things there will be a vote about.
      </p>

      <Link href="/" className="link">
        Back to the button
      </Link>
    </article>
  );
}
