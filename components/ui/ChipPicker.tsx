"use client";

import type { ReactNode } from "react";

import styles from "./ChipPicker.module.css";

export type ChipOption = {
  key: string;
  label: ReactNode;
  hint?: ReactNode;
};

type ChipPickerProps = {
  options: ChipOption[];
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
  name?: string;
  empty?: ReactNode;
  "aria-describedby"?: string;
};

export function ChipPicker({
  options,
  value,
  onChange,
  id,
  name,
  empty = "nothing to pick from yet",
  "aria-describedby": describedBy,
}: ChipPickerProps) {
  function toggle(key: string) {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  }

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={id ? `${id}-label` : undefined}
      aria-describedby={describedBy}
      className={styles.chips}
    >
      {options.length === 0 ? <span className={styles.empty}>{empty}</span> : null}
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={styles.chip}
          aria-pressed={value.includes(option.key)}
          onClick={() => toggle(option.key)}
        >
          {option.label}
          {option.hint ? <span className={styles.hint}>{option.hint}</span> : null}
        </button>
      ))}
      {name
        ? value.map((selected) => (
            <input key={selected} type="hidden" name={name} value={selected} />
          ))
        : null}
    </div>
  );
}
