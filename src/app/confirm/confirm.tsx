"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { confirmEmailAttachment } from "../actions";

type Status =
  | { kind: "working" }
  | { kind: "done"; email: string }
  | { kind: "failed"; message: string };

export function Confirm() {
  const [status, setStatus] = useState<Status>({ kind: "working" });

  useEffect(() => {
    // The token lives in the fragment, which browsers never send to a
    // server. That is the point: a mail scanner following the link — plenty
    // of corporate filters do — reaches this page and confirms nothing,
    // because only a browser running this code can read the fragment.
    const token = window.location.hash.replace(/^#/, "");

    // Take it out of the address bar so it is not left in history or in a
    // screenshot.
    history.replaceState(null, "", window.location.pathname);

    let live = true;
    void (async () => {
      const result = token
        ? await confirmEmailAttachment(token)
        : {
            ok: false as const,
            message:
              "This link is missing its second half. Open it directly from the email rather than copying part of it.",
          };
      if (!live) return;
      setStatus(
        result.ok
          ? { kind: "done", email: result.email }
          : { kind: "failed", message: result.message },
      );
    })();
    return () => {
      live = false;
    };
  }, []);

  if (status.kind === "working") {
    return (
      <article className="detail">
        <h1>One moment.</h1>
        <p>Checking the link.</p>
      </article>
    );
  }

  if (status.kind === "failed") {
    return (
      <article className="detail">
        <h1>That didn’t work.</h1>
        <p>{status.message}</p>
        <Link href="/" className="link">
          Back to the button
        </Link>
      </article>
    );
  }

  return (
    <article className="detail">
      <h1>Confirmed.</h1>
      <p>
        Your vote is now held against <strong>{status.email}</strong>. If you
        clear this browser, it is still yours.
      </p>
      <p>
        We write only when something you own is being decided. One click on the
        button page takes the address back, and nothing is kept.
      </p>
      <Link href="/" className="link">
        Back to the button
      </Link>
    </article>
  );
}
