import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "3am",
  description: "Build something dark before the sun comes up. A Hack Club YSWS.",
};

export const viewport: Viewport = {
  themeColor: "#101014",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
