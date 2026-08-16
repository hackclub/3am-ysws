import localFont from "next/font/local";

export const readex = localFont({
  src: [
    { path: "./fonts/ReadexPro-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ReadexPro-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-readex",
  display: "swap",
});

export const augie = localFont({
  src: "./fonts/augiepixel.woff2",
  variable: "--font-wordmark",
  display: "swap",
});
