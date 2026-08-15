"use client";

import { useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";

import styles from "./Dropzone.module.css";

type DropzoneProps = {
  onFile: (file: File) => void;
  title: ReactNode;
  help?: ReactNode;
  accept?: string;
  id?: string;
  "aria-describedby"?: string;
};

export function Dropzone({
  onFile,
  title,
  help,
  accept,
  id,
  "aria-describedby": describedBy,
}: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <button
      type="button"
      id={id}
      aria-describedby={describedBy}
      className={[styles.zone, over ? styles.over : null].filter(Boolean).join(" ")}
      onClick={() => input.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      <span className={styles.title}>{title}</span>
      {help ? <span className={styles.help}>{help}</span> : null}
      <input
        ref={input}
        type="file"
        accept={accept}
        className={styles.input}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </button>
  );
}
