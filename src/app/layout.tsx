import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://oursnow.co"),
  title: "OURS — a very small thing to own",
  description:
    "A button whose colour belongs to the people who voted on it. The person who made it gets one vote, the same as yours.",
  openGraph: {
    title: "A very small thing to own",
    description:
      "We started with a button. You get a say. So does the person who made it.",
    url: "https://oursnow.co",
    siteName: "OURS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fffefa",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to the button
        </a>
        <div className="page">
          <p className="brand">
            <Link href="/">OURS</Link>
          </p>
          <div className="main" id="main">
            {children}
          </div>
          <footer className="foot">
            <Link href="/deal">The deal</Link>
            <span>It starts small.</span>
            <Link href="/builders">For builders ↗</Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
