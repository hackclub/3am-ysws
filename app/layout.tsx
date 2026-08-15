import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL("https://3am.hackclub.com"),
  title: {
    default: "3am",
    template: "%s · 3am",
  },
  description: "Build something dark before the sun comes up. A Hack Club YSWS.",
  openGraph: {
    title: "3am",
    description: "Build something dark before the sun comes up. A Hack Club YSWS.",
    siteName: "3am",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#101014",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
