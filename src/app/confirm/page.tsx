import type { Metadata } from "next";
import { Confirm } from "./confirm";

export const metadata: Metadata = {
  title: "Confirming your address — OURS",
  robots: { index: false, follow: false },
};

export default function ConfirmPage() {
  return <Confirm />;
}
