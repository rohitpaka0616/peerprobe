import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "PeerProbe — Better software, together",
  description: "A peer testing workspace for student builders.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
