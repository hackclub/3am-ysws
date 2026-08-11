"use client";

import { useEffect, useRef } from "react";

export default function BatSpawner() {
  const isSpawningRef = useRef(false);

  useEffect(() => {
    let active = true;

    function spawnBat() {
      // Prevent multiple bats from spawning simultaneously
      if (isSpawningRef.current || !active) return;
      
      // Clean up any stray bat DOM elements before spawning a new one
      const existingBats = document.querySelectorAll(".bat");
      if (existingBats.length > 0) {
        existingBats.forEach((b) => b.remove());
      }

      isSpawningRef.current = true;

      const bat = document.createElement("div");
      bat.className = "bat";
      bat.innerHTML = `
        <svg viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="60" cy="45" rx="9" ry="7" fill="#232b40"/>
          <ellipse cx="60" cy="33" rx="7" ry="6" fill="#232b40"/>
          <circle cx="57" cy="32" r="1.6" fill="#ffb454"/>
          <circle cx="63" cy="32" r="1.6" fill="#ffb454"/>
          <path class="wl" d="M51 38 Q30 12 4 24 Q22 40 51 44 Z" fill="#232b40"/>
          <path class="wr" d="M69 38 Q90 12 116 24 Q98 40 69 44 Z" fill="#232b40"/>
        </svg>
      `;

      bat.style.top = `${10 + Math.random() * 40}vh`;
      const goRight = Math.random() < 0.5;
      const dur = 6 + Math.random() * 3;
      bat.style.animation = `${goRight ? "batRight" : "batLeft"} ${dur}s ease-in-out forwards`;
      document.body.appendChild(bat);

      setTimeout(() => {
        if (bat.parentNode) bat.remove();
        isSpawningRef.current = false;
      }, dur * 1000);
    }

    const intervalId = setInterval(spawnBat, 15000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  return null;
}
