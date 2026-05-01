import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pelican Cabinet Editor",
  description: "Kitchen cabinet editor floor plan UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
