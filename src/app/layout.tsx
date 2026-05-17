import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { CANONICAL_PUBLIC_ORIGIN } from "@/lib/env";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_PUBLIC_ORIGIN),
  title: "AgentOG — Action-bound approval",
  description:
    "Human approval framework for high-impact AI agent actions — execution gate, fingerprinting, audit.",
  themeColor: "#faf8f4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
