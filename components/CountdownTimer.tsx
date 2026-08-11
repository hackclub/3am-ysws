"use client";

import { useState, useEffect } from "react";

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Target: August 24th
    const targetDate = new Date("2026-08-24T23:59:59").getTime();

    function updateTimer() {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.75rem",
      backgroundColor: "rgba(11, 14, 26, 0.85)",
      border: "1px solid rgba(255, 77, 109, 0.35)",
      padding: "0.5rem 1.25rem",
      borderRadius: "980px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5), 0 0 12px rgba(255, 77, 109, 0.15)",
      backdropFilter: "blur(12px)",
      margin: "0 auto 1.5rem auto"
    }}>
      <span style={{
        color: "#ff4d6d",
        fontSize: "0.82rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        display: "flex",
        alignItems: "center",
        gap: "0.35rem"
      }}>
        Ends Aug 24th
      </span>

      <span style={{ color: "rgba(255, 255, 255, 0.2)", fontWeight: 300 }}>|</span>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontFamily: "'Space Grotesk', monospace",
        fontSize: "0.92rem",
        fontWeight: 700,
        color: "#f5ede0"
      }}>
        <span>{String(timeLeft.days).padStart(2, "0")}<span style={{ fontSize: "0.7rem", opacity: 0.6 }}>d</span></span>
        <span style={{ opacity: 0.4 }}>:</span>
        <span>{String(timeLeft.hours).padStart(2, "0")}<span style={{ fontSize: "0.7rem", opacity: 0.6 }}>h</span></span>
        <span style={{ opacity: 0.4 }}>:</span>
        <span>{String(timeLeft.minutes).padStart(2, "0")}<span style={{ fontSize: "0.7rem", opacity: 0.6 }}>m</span></span>
        <span style={{ opacity: 0.4 }}>:</span>
        <span style={{ color: "#ffb454", minWidth: "2ch" }}>{String(timeLeft.seconds).padStart(2, "0")}<span style={{ fontSize: "0.7rem", opacity: 0.6 }}>s</span></span>
      </div>
    </div>
  );
}
