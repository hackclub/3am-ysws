import type { Metadata } from "next";
import { inter, jetbrainsMono, spaceGrotesk } from "./fonts";
import SpriteIcons from "@/components/SpriteIcons";
import SparkTrail from "@/components/SparkTrail";
import BatSpawner from "@/components/BatSpawner";
import "./globals.css";

export const metadata: Metadata = {
  title: "THE 3AM YSWS",
  description:
    "You Ship, We Ship. Stay up late, build something real, and get rewarded for it. A Hack Club YSWS event for teens.",
  openGraph: {
    title: "YSWS 3AM at Hack Club",
    description: "Stay up late, build something real, and ship it before sunrise.",
    type: "website",
  },
  icons: {
    icon: "/hackclub-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}
    >
      <body>
        <SpriteIcons />
        {children}
        <SparkTrail />
        <BatSpawner />
      </body>
    </html>
  );
}
