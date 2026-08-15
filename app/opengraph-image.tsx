import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "3am, a Hack Club YSWS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [wordmark, body] = await Promise.all([
    readFile(join(process.cwd(), "app/fonts/augiepixel.ttf")),
    readFile(join(process.cwd(), "app/fonts/ReadexPro-Bold.ttf")),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: "#101014",
        backgroundImage:
          "radial-gradient(900px 520px at 78% -10%, rgba(111,99,135,0.45), transparent 62%)",
      }}
    >
      <div style={{ display: "flex", fontFamily: "Augie", fontSize: 210, color: "#f7e9a8" }}>
        3am
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Readex",
          fontSize: 44,
          color: "#f4f0e8",
          marginTop: 12,
        }}
      >
        build something dark before the sun comes up
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Readex",
          fontSize: 28,
          color: "#a89bbd",
          marginTop: 28,
        }}
      >
        a Hack Club YSWS
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Augie", data: wordmark, style: "normal" },
        { name: "Readex", data: body, weight: 700, style: "normal" },
      ],
    },
  );
}
