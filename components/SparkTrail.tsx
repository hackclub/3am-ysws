"use client";

import { useEffect } from "react";

export default function SparkTrail() {
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (Math.random() > 0.4) return;
      const dot = document.createElement("div");
      dot.className = "trail-dot";
      dot.style.left = e.clientX + "px";
      dot.style.top = e.clientY + "px";
      document.body.appendChild(dot);
      setTimeout(() => {
        dot.style.transition = "opacity 0.3s";
        dot.style.opacity = "0";
        setTimeout(() => dot.remove(), 300);
      }, 150);
    }

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return null;
}
