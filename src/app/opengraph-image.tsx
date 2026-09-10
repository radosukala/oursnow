import { ImageResponse } from "next/og";
import { readState } from "@/lib/colour";
import { OPENING_COLOUR } from "@/lib/config";

export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "The current colour of the button, and the count behind it";

/**
 * The share card is the scoreboard.
 *
 * A link posted anywhere shows the count as it stands, so the picture in
 * somebody's feed is the live state of an argument rather than a logo. It
 * is the one place where the mechanism explains itself without a sentence.
 */
export default async function Image() {
  let blue = 0;
  let red = 0;
  let committed: "blue" | "red" = OPENING_COLOUR;
  let reachable = true;

  try {
    const state = await readState(null);
    blue = state.blue;
    red = state.red;
    committed = state.committed;
  } catch {
    reachable = false;
  }

  const paper = "#fffefa";
  const ink = "#20201e";
  const muted = "#696861";
  const fill = committed === "red" ? "#cf392a" : "#244ce8";
  const deep = committed === "red" ? "#952219" : "#1533ad";
  const total = blue + red;

  const headline = !reachable
    ? "A very small thing to own."
    : total === 0
      ? "Nobody has voted yet."
      : total === 1
        ? "One person has decided its colour."
        : blue === red
          ? `Level at ${blue} each.`
          : `It’s ${committed}, ${Math.max(blue, red)} to ${Math.min(blue, red)}.`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: paper,
          padding: "60px 70px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 8,
            color: ink,
            fontWeight: 500,
          }}
        >
          OURS
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 30,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: fill,
              color: "#ffffff",
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: 3,
              padding: "34px 84px",
              borderRadius: 999,
              boxShadow: `0 10px 0 ${deep}`,
            }}
          >
            OK
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 54,
              color: ink,
              textAlign: "center",
              letterSpacing: -1,
            }}
          >
            {headline}
          </div>

          {reachable && total > 0 ? (
            <div
              style={{
                display: "flex",
                fontSize: 26,
                letterSpacing: 6,
                color: muted,
              }}
            >
              {`BLUE ${blue}   ·   RED ${red}`}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            color: muted,
          }}
        >
          <div style={{ display: "flex" }}>
            The colour belongs to whoever voted.
          </div>
          <div style={{ display: "flex" }}>oursnow.co</div>
        </div>
      </div>
    ),
    size,
  );
}
