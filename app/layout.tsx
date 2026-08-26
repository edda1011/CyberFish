import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CyberFish — Check Before You Trust",
  description: "Check suspicious links and emails before they put your accounts, identity, or money at risk.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
