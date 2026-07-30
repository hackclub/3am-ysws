"use client";

import { useState } from "react";

export default function RewardImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="reward-img"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2.5rem",
          height: "100%",
        }}
      >
        🎁
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="reward-img" src={src} alt={alt} onError={() => setFailed(true)} />
  );
}
