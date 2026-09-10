import { readState, type State } from "@/lib/colour";
import { currentParticipantId } from "@/lib/participant";
import { EMAIL_ENABLED } from "@/lib/config";
import { OPENING_COLOUR } from "@/lib/config";
import { Flow } from "./flow";

export const dynamic = "force-dynamic";

/** What the page shows when the count cannot be read. */
const unknownState: State = {
  blue: 0,
  red: 0,
  committed: OPENING_COLOUR,
  revision: 0,
  mine: null,
  joined: false,
  opening: true,
};

export default async function Home() {
  let state = unknownState;
  let reachable = true;

  try {
    state = await readState(await currentParticipantId());
  } catch (error) {
    // The front door should open even when the count cannot be reached.
    // A visitor who arrives during an outage gets the page and an honest
    // line about it, rather than a blank error with the reason removed.
    reachable = false;
    console.error(
      "[oursnow] could not read the count — see /api/health for which of " +
        "configuration, connectivity, or migrations is at fault:",
      error,
    );
  }

  return (
    <Flow initial={state} emailEnabled={EMAIL_ENABLED} reachable={reachable} />
  );
}
