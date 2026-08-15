import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CyberFish",
  description: "A phishing URL and email analyzer.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
