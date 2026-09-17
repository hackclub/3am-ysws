"use client";

import { useEffect, useState } from "react";

import styles from "./SubmissionCountdown.module.css";

function remaining(target: number) {
  return Math.max(0, target - Date.now());
}

function parts(ms: number) {
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function SubmissionCountdown({
  deadline,
  submissionsOpen,
}: {
  deadline: string | null;
  submissionsOpen: boolean;
}) {
  const target = deadline ? Date.parse(deadline) : NaN;
  const [left, setLeft] = useState(() => (Number.isFinite(target) ? remaining(target) : 0));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!Number.isFinite(target)) return;

    const tick = () => setLeft(remaining(target));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (!Number.isFinite(target)) {
    return submissionsOpen ? null : (
      <div className={styles.complete} role="status" aria-live="polite">
        <strong>Submissions Closed</strong>
        <span>No longer taking projects</span>
      </div>
    );
  }

  if (!submissionsOpen) {
    return (
      <div className={styles.complete} role="status" aria-live="polite">
        <strong>Submissions Closed</strong>
        <span>No longer taking projects</span>
      </div>
    );
  }

  if (mounted && left <= 0) {
    return (
      <div className={styles.complete} role="status" aria-live="polite">
        <strong>YSWS Completed</strong>
        <span>No longer taking projects</span>
      </div>
    );
  }

  const value = parts(left);

  return (
    <div className={styles.countdown} role="status" aria-live="polite">
      <span className={styles.label}>submissions close in</span>
      <div className={styles.units} aria-label="time remaining">
        <span><strong>{value.days}</strong><small>d</small></span>
        <span><strong>{String(value.hours).padStart(2, "0")}</strong><small>h</small></span>
        <span><strong>{String(value.minutes).padStart(2, "0")}</strong><small>m</small></span>
        <span><strong>{String(value.seconds).padStart(2, "0")}</strong><small>s</small></span>
      </div>
    </div>
  );
}
