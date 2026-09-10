import { readState } from "@/lib/colour";
import { currentParticipantId } from "@/lib/participant";
import { EMAIL_ENABLED } from "@/lib/config";
import { Flow } from "./flow";

export const dynamic = "force-dynamic";

export default async function Home() {
  const state = await readState(await currentParticipantId());
  return <Flow initial={state} emailEnabled={EMAIL_ENABLED} />;
}
