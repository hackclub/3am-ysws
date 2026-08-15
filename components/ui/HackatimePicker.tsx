"use client";

import { useMemo, useState } from "react";

import { formatHours } from "@/lib/hackatime/format";
import type { PickerProject } from "@/lib/hackatime/projects";

import styles from "./HackatimePicker.module.css";

const COLLAPSED = 6;

export function HackatimePicker({
  options,
  value,
  onChange,
  id,
  name,
  "aria-describedby": describedBy,
}: {
  options: PickerProject[];
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
  name?: string;
  "aria-describedby"?: string;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const ordered = useMemo(() => {
    const picked = new Set(value);
    return [...options].sort((a, b) => {
      const byPicked = Number(picked.has(b.key)) - Number(picked.has(a.key));
      return byPicked !== 0 ? byPicked : b.seconds - a.seconds;
    });
  }, [options, value]);

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? ordered.filter((option) => option.key.toLowerCase().includes(needle)) : ordered;
  }, [ordered, query]);

  const visible = showAll || query ? matching : matching.slice(0, COLLAPSED);
  const hidden = matching.length - visible.length;
  const totalSeconds = options
    .filter((option) => value.includes(option.key))
    .reduce((sum, option) => sum + option.seconds, 0);

  function toggle(key: string) {
    onChange(value.includes(key) ? value.filter((entry) => entry !== key) : [...value, key]);
  }

  if (options.length === 0) {
    return (
      <div className={styles.picker} id={id}>
        <p className={styles.empty}>
          Nothing tracked yet. Connect Hackatime and code for a bit, then come back.
        </p>
      </div>
    );
  }

  return (
    <div
      className={styles.picker}
      id={id}
      role="group"
      aria-labelledby={id ? `${id}-label` : undefined}
      aria-describedby={describedBy}
    >
      {options.length > COLLAPSED ? (
        <input
          className={styles.search}
          value={query}
          placeholder={`search ${options.length} projects`}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="search your hackatime projects"
        />
      ) : null}

      <div className={styles.list}>
        {visible.length === 0 ? (
          <p className={styles.empty}>Nothing matches that.</p>
        ) : (
          visible.map((option) => {
            const picked = value.includes(option.key);
            return (
              <button
                key={option.key}
                type="button"
                className={styles.option}
                aria-pressed={picked}
                onClick={() => toggle(option.key)}
              >
                <span className={styles.tick} aria-hidden="true">
                  {picked ? "✓" : ""}
                </span>
                <span className={styles.name}>{option.key}</span>
                <span className={styles.hours}>{option.hours}</span>
              </button>
            );
          })
        )}
      </div>

      <div className={styles.foot}>
        <span className={styles.total}>
          {value.length === 0 ? (
            "nothing picked yet"
          ) : (
            <>
              {value.length} picked · <b>{formatHours(totalSeconds)}</b>
            </>
          )}
        </span>
        {hidden > 0 ? (
          <button type="button" className={styles.more} onClick={() => setShowAll(true)}>
            show {hidden} more
          </button>
        ) : value.length > 0 ? (
          <button type="button" className={styles.clear} onClick={() => onChange([])}>
            clear
          </button>
        ) : null}
      </div>

      {name ? value.map((key) => <input key={key} type="hidden" name={name} value={key} />) : null}
    </div>
  );
}
