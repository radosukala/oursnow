"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  chooseColour,
  removeEmail,
  requestEmailAttachment,
  withdrawColour,
  type ActionResult,
} from "./actions";
import type { State } from "@/lib/colour";

type Screen = "start" | "vote" | "result";

function tallyLine(state: State): string {
  if (state.opening) return "NOBODY HAS VOTED YET";
  return `BLUE ${state.blue} · RED ${state.red}`;
}

/**
 * What just happened, said plainly.
 *
 * The load-bearing case is the one where somebody lost: it has to read as a
 * fact about the count and not as a consolation, because the whole claim of
 * the page is that losing a vote costs you nothing here.
 */
function verdict(state: State): string {
  const total = state.blue + state.red;
  const leader = state.blue > state.red ? "Blue" : "Red";

  if (state.mine === null) {
    if (total === 0) {
      return "Nobody holds a colour now, so the button keeps the one it had. Your place is unchanged.";
    }
    return `You've withdrawn your colour. Your place is unchanged. ${leader} leads.`;
  }

  if (total === 1) {
    return `You chose ${state.mine}. Nobody else has voted yet, so right now it is entirely yours.`;
  }

  if (state.blue === state.red) {
    return `You chose ${state.mine}. It's level, so the button keeps the colour it had. It's still yours.`;
  }

  if (state.mine === state.committed) {
    return `You chose ${state.mine}. ${leader} leads. Your vote is in it.`;
  }

  return `You chose ${state.mine}. ${leader} leads. It's still yours.`;
}

export function Flow({
  initial,
  emailEnabled,
  reachable = true,
  held = null,
}: {
  initial: State;
  emailEnabled: boolean;
  /** False when the server could not read the count for this request. */
  reachable?: boolean;
  /** The address already confirmed for this participant, if any. */
  held?: string | null;
}) {
  const [state, setState] = useState<State>(initial);
  const [screen, setScreen] = useState<Screen>("start");
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailNote, setEmailNote] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(held);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function apply(result: ActionResult, then?: () => void) {
    if (result.ok) {
      setState(result.state);
      setError(null);
      then?.();
    } else {
      setError(result.message);
    }
  }

  function choose(colour: "blue" | "red") {
    setError(null);
    startTransition(async () => {
      apply(await chooseColour(colour), () => setScreen("result"));
    });
  }

  function withdraw() {
    setError(null);
    startTransition(async () => {
      apply(await withdrawColour());
    });
  }

  function claim(event: React.FormEvent) {
    event.preventDefault();
    setEmailNote(null);
    startTransition(async () => {
      const result = await requestEmailAttachment(email);
      if (result.ok) {
        setSent(true);
        setEmailNote(
          "Check your inbox. Nothing is kept against that address until you follow the link.",
        );
        setEmail("");
      } else {
        setEmailNote(result.message);
      }
    });
  }

  function forget() {
    startTransition(async () => {
      await removeEmail();
      setAddress(null);
      setSent(false);
      setEmailNote("Gone. Your vote is back to living in this browser alone.");
    });
  }

  const object = (
    <button
      type="button"
      className="object"
      data-colour={state.committed}
      onClick={() => {
        if (screen === "start") {
          setScreen(state.joined ? "result" : "vote");
        } else {
          setHelp("It still doesn't do anything. What it does is the next thing to decide.");
        }
      }}
    >
      Let’s go
    </button>
  );

  if (screen === "start") {
    return (
      <section>
        <h1>
          A very small
          <br />
          thing to own.
        </h1>
        <p className="sub">We started with a button.</p>
        {object}
        <p className="caption">You get a say. So does the person who made it.</p>
      </section>
    );
  }

  if (screen === "vote") {
    return (
      <section>
        <h1>Blue or red?</h1>
        <p className="sub">Your first decision.</p>
        {object}
        <p className="caption">
          {help ??
            (!reachable
              ? "We can’t reach the count right now, so this is the colour it opened with."
              : state.opening
                ? "Nobody has chosen yet. Until somebody does, this is the colour it opened with, not a decision."
                : "Its colour belongs to the majority.")}
        </p>
        <div className="choices">
          <button
            type="button"
            className="choice"
            aria-pressed={state.mine === "blue"}
            disabled={pending || !reachable}
            onClick={() => choose("blue")}
          >
            Blue
          </button>
          <button
            type="button"
            className="choice"
            aria-pressed={state.mine === "red"}
            disabled={pending || !reachable}
            onClick={() => choose("red")}
          >
            Red
          </button>
        </div>
        {!reachable ? (
          <p className="notice">
            Voting is unavailable until the count can be reached again. Nothing
            you do here would be recorded, so nothing is pretending to be.
          </p>
        ) : null}
        {error ? <p className="notice">{error}</p> : null}
        <p className="caption">
          Choosing also joins you, with equal standing. Read{" "}
          <Link href="/deal" className="link">
            the deal
          </Link>{" "}
          first.
        </p>
      </section>
    );
  }

  return (
    <section className="enter" aria-live="polite">
      <h1>Yours. Equally.</h1>
      <p className="sub">
        The person who made this gets the same say as you. That’s the deal.
      </p>
      {object}
      <p className="outcome">{help ?? verdict(state)}</p>
      <p className="tally">{tallyLine(state)}</p>
      <div className="actions">
        <Link href="/next" className="link">
          What should it do?
        </Link>
        <button
          type="button"
          className="link"
          disabled={pending}
          onClick={() => {
            setHelp(null);
            setScreen("vote");
          }}
        >
          {state.mine ? "Change my vote" : "Choose a colour again"}
        </button>
        {state.mine ? (
          <button
            type="button"
            className="link"
            disabled={pending}
            onClick={withdraw}
          >
            Withdraw my vote
          </button>
        ) : null}
      </div>
      {error ? <p className="notice">{error}</p> : null}
      {emailEnabled ? (
        address ? (
          <div className="claim">
            <p className="caption">
              Held against <strong>{address}</strong>. Clear this browser and
              your vote is still yours.{" "}
              <button
                type="button"
                className="link"
                disabled={pending}
                onClick={forget}
              >
                Take it back
              </button>
            </p>
          </div>
        ) : (
          <form className="claim" onSubmit={claim}>
            {!sent ? (
              <div className="claim-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email, so your vote outlives this browser"
                  aria-label="Your email address"
                  autoComplete="email"
                />
                <button type="submit" disabled={pending || email.length === 0}>
                  Send a link
                </button>
              </div>
            ) : null}
            {emailNote ? <p className="caption">{emailNote}</p> : null}
            {!sent ? (
              <p className="caption">
                We send one link to check it is yours. Nothing is kept unless
                you follow it.
              </p>
            ) : null}
          </form>
        )
      ) : null}
    </section>
  );
}
