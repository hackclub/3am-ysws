"use client";

import { useEffect, useState } from "react";

const phrases = [
  "You ship. We ship. After dark.",
  "Build at night. Claim your reward.",
  "Quiet hours, real projects.",
];

export default function TypewriterSubtitle() {
  const [text, setText] = useState(phrases[0]);

  useEffect(() => {
    let pi = 0;
    let ci = phrases[0].length;
    let deleting = true; // Pause briefly on first phrase before cycling
    let timeoutId: ReturnType<typeof setTimeout>;

    function typeLoop() {
      const cur = phrases[pi];

      if (!deleting) {
        ci++;
        setText(cur.slice(0, ci));
        if (ci === cur.length) {
          deleting = true;
          timeoutId = setTimeout(typeLoop, 2600);
          return;
        }
      } else {
        ci--;
        setText(cur.slice(0, ci));
        if (ci === 0) {
          deleting = false;
          pi = (pi + 1) % phrases.length;
        }
      }
      timeoutId = setTimeout(typeLoop, deleting ? 35 : 65);
    }

    timeoutId = setTimeout(typeLoop, 2200);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <p className="hero-sub" id="heroSub" style={{ minHeight: "1.6em" }}>
      {text}
    </p>
  );
}
