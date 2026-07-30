"use client";

import { useEffect, useRef } from "react";

export default function MoonPhase() {
  const shadowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateMoonPhase() {
      const moonShadow = shadowRef.current;
      if (!moonShadow) return;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      moonShadow.style.transform = `translateX(${10 + pct * 150}%)`;
    }

    document.addEventListener("scroll", updateMoonPhase, { passive: true });
    updateMoonPhase();

    return () => document.removeEventListener("scroll", updateMoonPhase);
  }, []);

  return (
    <div className="moon-wrap" id="moonWrap">
      <div className="moon-glow-3"></div>
      <div className="moon-glow-2"></div>
      <div className="moon-glow-1"></div>
      <div className="moon-disk">
        <svg className="moon-svg" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="95" cy="85" rx="22" ry="18" fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth="3" />
          <ellipse cx="95" cy="85" rx="16" ry="12" fill="rgba(0,0,0,0.09)" />
          <ellipse cx="45" cy="110" rx="14" ry="11" fill="none" stroke="rgba(0,0,0,0.13)" strokeWidth="2.5" />
          <ellipse cx="45" cy="110" rx="9" ry="7" fill="rgba(0,0,0,0.08)" />
          <ellipse cx="65" cy="40" rx="9" ry="7" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="2" />
          <ellipse cx="120" cy="45" rx="7" ry="5.5" fill="none" stroke="rgba(0,0,0,0.11)" strokeWidth="1.8" />
          <circle cx="75" cy="130" r="4" fill="rgba(0,0,0,0.06)" />
        </svg>
        <div className="moon-shadow" id="moonShadow" ref={shadowRef}></div>
      </div>
    </div>
  );
}
