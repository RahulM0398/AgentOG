import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentOG — Action-bound approval",
  description:
    "Human approval framework for high-impact AI agent actions — execution gate, fingerprinting, audit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
