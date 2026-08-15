"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./page.module.css";

const FRAMES = [1, 2, 3, 4, 5, 6, 7].map((n) => `/assets/splash${n}.png`);
const FRAME_MS = 900;
const HOLD_MS = 1400;
const FADE_MS = 1000;
const SEEN_KEY = "splashSeen";

export default function WelcomePage() {
  const router = useRouter();
  const [frame, setFrame] = useState(0);
  const [showLabel, setShowLabel] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    sessionStorage.setItem(SEEN_KEY, "1");
    router.replace("/");
  }, [router]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || sessionStorage.getItem(SEEN_KEY)) {
      finish();
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const tick = setInterval(() => {
      setFrame((current) => {
        if (current < FRAMES.length - 1) return current + 1;
        clearInterval(tick);
        setShowLabel(true);
        timers.push(setTimeout(() => setLeaving(true), HOLD_MS));
        timers.push(setTimeout(finish, HOLD_MS + FADE_MS));
        return current;
      });
    }, FRAME_MS);

    return () => {
      clearInterval(tick);
      timers.forEach(clearTimeout);
    };
  }, [finish]);

  return (
    <>
      <div className={[styles.splash, leaving ? styles.leaving : null].filter(Boolean).join(" ")}>
        {FRAMES.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt=""
            width={900}
            height={900}
            unoptimized
            priority={index < 2}
            className={[styles.frame, "pixel", index === frame ? styles.on : null]
              .filter(Boolean)
              .join(" ")}
          />
        ))}
        <p className={[styles.label, showLabel ? styles.on : null].filter(Boolean).join(" ")}>
          a Hack Club YSWS
        </p>
      </div>
      <button type="button" className={styles.skip} onClick={finish}>
        skip intro <span aria-hidden="true">→</span>
      </button>
    </>
  );
}
