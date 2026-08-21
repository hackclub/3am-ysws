"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";

import styles from "./ThumbnailField.module.css";

export function ThumbnailField({
  value,
  onChange,
  id,
  "aria-describedby": describedBy,
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  "aria-describedby"?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    setProblem(null);

    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/uploads/thumbnail", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as {
        url?: string;
        message?: string;
      };

      if (response.ok && result.url) {
        onChange(result.url);
      } else {
        setProblem(result.message ?? "That did not upload.");
        setManual(true);
      }
    } catch {
      setProblem("That did not upload. Check your connection.");
      setManual(true);
    } finally {
      setBusy(false);
    }
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <div className={styles.field} id={id}>
      <button
        type="button"
        aria-describedby={describedBy}
        className={[styles.drop, over ? styles.over : null].filter(Boolean).join(" ")}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={styles.preview} />
        ) : (
          <span className={styles.placeholder} aria-hidden="true">
            🌙
          </span>
        )}
        <span className={styles.words}>
          <span className={styles.title}>
            {busy ? "uploading…" : value ? "change screenshot" : "drop a screenshot"}
          </span>
          <span className={styles.hint}>
            {value ? value.replace(/^https?:\/\//, "") : "png, jpg or webp, up to 5MB"}
          </span>
        </span>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className={styles.input}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </button>

      {problem ? <span className={styles.error}>{problem}</span> : null}

      {manual ? (
        <div className={styles.row}>
          <input
            className={styles.link}
            value={value}
            placeholder="https://…/screenshot.png"
            onChange={(event) => onChange(event.target.value)}
            aria-label="screenshot link"
          />
        </div>
      ) : (
        <button type="button" className={styles.toggle} onClick={() => setManual(true)}>
          paste a link instead
        </button>
      )}
    </div>
  );
}
