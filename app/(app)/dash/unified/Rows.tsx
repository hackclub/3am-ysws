"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { StatusWord } from "@/components/ui/StatusWord";
import type { ApprovedRow } from "@/lib/ysws/types";

import styles from "./page.module.css";

type Preview = { status: string; payload: unknown; problem: { message: string } | null };

const WHEN = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

const WORD = {
  sent: { tone: "ok", text: "sent" },
  error: { tone: "bad", text: "error" },
  held: { tone: "warn", text: "held" },
  queued: { tone: "queued", text: "processing" },
} as const;

function word(row: ApprovedRow): {
  tone: "ok" | "bad" | "warn" | "queued" | "muted";
  text: string;
} {
  return row.state ? WORD[row.state] : { tone: "muted", text: "not sent" };
}

export function Rows({ rows }: { rows: ApprovedRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});

  function fields(row: ApprovedRow): Record<string, string> {
    return (
      draft[row.projectId] ?? {
        overrideHours: row.overrideMinutes ? String(row.overrideMinutes / 60) : "",
        ageJustification: row.ageJustification ?? "",
        duplicateJustification: row.duplicateJustification ?? "",
      }
    );
  }

  function set(row: ApprovedRow, key: string, value: string) {
    setDraft({ ...draft, [row.projectId]: { ...fields(row), [key]: value } });
    setSaved(null);
  }

  async function show(row: ApprovedRow) {
    if (open === row.projectId) {
      setOpen(null);
      return;
    }

    setBusy(row.projectId);
    setProblem(null);
    setPreview(null);

    const response = await fetch(`/api/admin/ysws/${row.projectId}`, { cache: "no-store" });
    setBusy(null);

    if (!response.ok) {
      setProblem("We could not build that preview.");
      return;
    }

    setPreview((await response.json()) as Preview);
    setOpen(row.projectId);
  }

  async function save(row: ApprovedRow) {
    const values = fields(row);
    setBusy(row.projectId);
    setProblem(null);

    const response = await fetch(`/api/admin/ysws/${row.projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overrideHours: values.overrideHours ? Number(values.overrideHours) : null,
        ageJustification: values.ageJustification,
        duplicateJustification: values.duplicateJustification,
      }),
    });

    setBusy(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      setProblem(body.message ?? "That did not save.");
      return;
    }

    setSaved(row.projectId);
    router.refresh();
  }

  async function send(row: ApprovedRow) {
    setBusy(row.projectId);
    setProblem(null);

    const response = await fetch(`/api/admin/ysws/${row.projectId}`, { method: "POST" });
    setBusy(null);

    if (response.ok) {
      setOpen(null);
      router.refresh();
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    setProblem(body.message ?? `That did not send (${body.error ?? "unknown"}).`);
    router.refresh();
  }

  return (
    <>
      {problem ? <Banner tone="bad">{problem}</Banner> : null}

      {rows.map((row) => {
        const state = word(row);
        const working = busy === row.projectId;
        const showing = open === row.projectId;
        const values = fields(row);
        const hours = (row.overrideMinutes ?? row.approvedMinutes ?? 0) / 60;

        return (
          <div className={styles.row} key={row.projectId}>
            <div className={styles.head}>
              <span className={styles.title}>{row.title}</span>
              <span className={styles.sub}>
                {row.maker} · {hours}h
                {row.decidedAt ? ` · approved ${WHEN.format(new Date(row.decidedAt))}` : ""}
                {row.recordId ? ` · ${row.recordId}` : ""}
              </span>
              <span className={styles.spacer} />
              <StatusWord tone={state.tone}>{state.text}</StatusWord>
            </div>

            {row.state === "queued" ? (
              <span className={styles.sub}>
                handed to the bridge, reload this page to pick up the record id
              </span>
            ) : null}
            {row.error ? <span className={styles.sub}>{row.error}</span> : null}
            {row.missing.length > 0 ? (
              <span className={styles.sub}>the maker still owes us {row.missing.join(", ")}</span>
            ) : null}

            <div className={styles.actions}>
              <Button variant="quiet" onClick={() => show(row)} loading={working && !showing}>
                {showing ? "hide" : "preview"}
              </Button>
              {row.state === "sent" || row.state === "queued" ? null : (
                <Button
                  onClick={() => send(row)}
                  loading={working && showing}
                  loadingLabel="sending…"
                >
                  send to unified
                </Button>
              )}
            </div>

            {showing && preview ? (
              <div className={styles.details}>
                {preview.problem ? (
                  <Banner tone="warn" title="this will not send yet">
                    {preview.problem.message}
                  </Banner>
                ) : null}

                <pre className={styles.payload}>{JSON.stringify(preview.payload, null, 2)}</pre>

                <div className={styles.overrides}>
                  <Field id={`${row.projectId}-hours`} label="override hours">
                    <Input
                      value={values.overrideHours}
                      placeholder={String((row.approvedMinutes ?? 0) / 60)}
                      onChange={(event) => set(row, "overrideHours", event.target.value)}
                    />
                  </Field>
                  <Field
                    id={`${row.projectId}-age`}
                    label="age justification"
                    help="Needed when the maker was 18 or over at review."
                  >
                    <Textarea
                      rows={2}
                      value={values.ageJustification}
                      onChange={(event) => set(row, "ageJustification", event.target.value)}
                    />
                  </Field>
                  <Field
                    id={`${row.projectId}-duplicate`}
                    label="duplicate justification"
                    help="Needed when another project shares this code url."
                  >
                    <Textarea
                      rows={2}
                      value={values.duplicateJustification}
                      onChange={(event) => set(row, "duplicateJustification", event.target.value)}
                    />
                  </Field>
                  <div className={styles.line}>
                    <Button variant="quiet" onClick={() => save(row)} loading={working}>
                      save overrides
                    </Button>
                    {saved === row.projectId ? (
                      <span className={styles.savedNote}>saved</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
