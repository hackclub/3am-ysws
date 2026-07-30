"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  baseA: number;
  phase: number;
  speed: number;
}

export default function StarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const hero = canvas.closest(".hero") as HTMLElement | null;
    if (!hero) return;

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    const mouse = { x: -9999, y: -9999 };
    let rafId = 0;

    function resize() {
      w = canvas!.width = hero!.clientWidth;
      h = canvas!.height = hero!.clientHeight;
      const count = Math.floor((w * h) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h * 0.68,
        r: Math.random() * 1.4 + 0.4,
        baseA: Math.random() * 0.5 + 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.015 + 0.006,
      }));
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = hero!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }

    function handleMouseLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    function render(t: number) {
      ctx!.clearRect(0, 0, w, h);
      stars.forEach((s) => {
        const a = s.baseA + Math.sin(t * s.speed + s.phase) * 0.25;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(230,235,245,${Math.max(0, a)})`;
        ctx!.fill();
      });

      const near = stars.filter((s) => Math.hypot(s.x - mouse.x, s.y - mouse.y) < 140);
      for (let i = 0; i < near.length; i++) {
        for (let j = i + 1; j < near.length; j++) {
          const d = Math.hypot(near[i].x - near[j].x, near[i].y - near[j].y);
          if (d < 130) {
            ctx!.beginPath();
            ctx!.moveTo(near[i].x, near[i].y);
            ctx!.lineTo(near[j].x, near[j].y);
            ctx!.strokeStyle = `rgba(139,124,246,${0.35 * (1 - d / 130)})`;
            ctx!.lineWidth = 1;
            ctx!.stroke();
          }
        }
      }
      rafId = requestAnimationFrame(render);
    }

    window.addEventListener("resize", resize);
    hero.addEventListener("mousemove", handleMouseMove);
    hero.addEventListener("mouseleave", handleMouseLeave);
    resize();
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      hero.removeEventListener("mousemove", handleMouseMove);
      hero.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return <canvas id="starCanvas" ref={canvasRef} />;
}
