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
  const [composing, setComposing] = useState<string | null>(null);
  const [dm, setDm] = useState<Record<string, string>>({});

  function fields(row: ApprovedRow): Record<string, string> {
    return (
      draft[row.projectId] ?? {
        overrideHours: row.overrideMinutes ? String(row.overrideMinutes / 60) : "",
        ageJustification: row.ageJustification ?? "",
        duplicateJustification: row.duplicateJustification ?? "",
        nameJustification: row.nameJustification ?? "",
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
        nameJustification: values.nameJustification,
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

  async function remind(row: ApprovedRow) {
    setBusy(row.projectId);
    setProblem(null);
    const response = await fetch(`/api/admin/ysws/${row.projectId}/remind`, { method: "POST" });
    setBusy(null);
    if (response.ok) {
      setSaved(`reminded:${row.projectId}`);
      return;
    }
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    setProblem(body.message ?? "Could not send the Slack reminder.");
  }

  function dmTemplate(row: ApprovedRow): string {
    const hi = row.firstName?.trim() || row.maker;
    const settings = `${window.location.origin}/dash/settings`;
    if (row.lastNameFlag) {
      return [
        `Hey ${hi}! 👋 Quick one before we send your 3AM project *${row.title}* off for your grant.`,
        "",
        `The last name on your account is "${row.lastName ?? ""}", and Hack Club needs your real, legal last name (initials, a dot or placeholders can't be accepted, sorry!).`,
        `Could you update it here: <${settings}|3AM settings>?`,
        "",
        "If you genuinely don't have a last name, just reply here and confirm that, and we'll note it on your submission.",
      ].join("\\n");
    }
    return `Hey ${hi}! 👋 Quick one about your 3AM project *${row.title}*: `;
  }

  function compose(row: ApprovedRow) {
    if (composing === row.projectId) { setComposing(null); return; }
    if (dm[row.projectId] === undefined) setDm({ ...dm, [row.projectId]: dmTemplate(row) });
    setComposing(row.projectId);
    setSaved(null);
  }

  async function message(row: ApprovedRow) {
    setBusy(row.projectId);
    setProblem(null);
    try {
      const response = await fetch(`/api/admin/ysws/${row.projectId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: dm[row.projectId] ?? "" }),
      });
      if (response.ok) { setComposing(null); setSaved(`messaged:${row.projectId}`); return; }
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      setProblem(body.message ?? "Could not send that Slack message.");
    } catch { setProblem("Could not reach the server. Try again."); }
    finally { setBusy(null); }
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

  async function resubmit(row: ApprovedRow) {
    const values = fields(row);
    setBusy(row.projectId);
    setProblem(null);

    const savedResponse = await fetch(`/api/admin/ysws/${row.projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overrideHours: values.overrideHours ? Number(values.overrideHours) : null,
        ageJustification: values.ageJustification,
        duplicateJustification: values.duplicateJustification,
      }),
    });

    if (!savedResponse.ok) {
      const body = (await savedResponse.json().catch(() => ({}))) as { message?: string };
      setBusy(null);
      setProblem(body.message ?? "Those changes did not save, so nothing was resubmitted.");
      return;
    }

    const response = await fetch(`/api/admin/ysws/${row.projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resubmit: true }),
    });
    setBusy(null);

    if (response.ok) {
      setOpen(null);
      router.refresh();
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    setProblem(body.message ?? `That did not resubmit (${body.error ?? "unknown"}).`);
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

            <span className={styles.sub}>
              legal name: {row.firstName?.trim() || "—"}{" "}
              <span className={row.lastNameFlag ? styles.nameBad : styles.nameOk}>
                {row.lastName?.trim() || "(no last name)"}
              </span>
              {row.nameJustification ? " · name note added" : ""}
            </span>
            {row.lastNameFlag ? (
              <span className={styles.nameWarn}>
                {row.lastNameFlag.message}{" "}
                {row.nameJustification
                  ? "A name note is on file, so this can go."
                  : "Ask the maker on Slack, or add a name note with their confirmation before sending."}
              </span>
            ) : null}

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
              {row.missing.length > 0 && row.state !== "sent" ? (
                <Button
                  variant="quiet"
                  onClick={() => remind(row)}
                  loading={working}
                  loadingLabel="sending reminder…"
                >
                  remind on Slack
                </Button>
              ) : null}
              <Button variant="quiet" onClick={() => compose(row)}>
                {composing === row.projectId ? "close message" : "message on Slack"}
              </Button>
              {saved === `messaged:${row.projectId}` ? (
                <span className={styles.savedNote}>Slack message sent</span>
              ) : null}
              {saved === `reminded:${row.projectId}` ? (
                <span className={styles.savedNote}>Slack reminder sent</span>
              ) : null}
              {row.state === "sent" ? (
                showing ? (
                  <Button
                    onClick={() => resubmit(row)}
                    loading={working}
                    loadingLabel="resubmitting…"
                  >
                    resubmit to unified
                  </Button>
                ) : null
              ) : row.state === "queued" ? null : (
                <Button
                  onClick={() => send(row)}
                  loading={working && showing}
                  loadingLabel="sending…"
                >
                  send to unified
                </Button>
              )}
            </div>

            {composing === row.projectId ? (
              <div className={styles.details}>
                <Field id={`${row.projectId}-dm`} label={`DM ${row.maker} on Slack`} help="Sent from the 3AM bot. Slack formatting works.">
                  <Textarea rows={6} value={dm[row.projectId] ?? ""} onChange={(event) => setDm({ ...dm, [row.projectId]: event.target.value })} />
                </Field>
                <div className={styles.line}>
                  <Button onClick={() => message(row)} loading={working} loadingLabel="sending…" disabled={!(dm[row.projectId] ?? "").trim()}>send DM</Button>
                  <Button variant="quiet" onClick={() => setDm({ ...dm, [row.projectId]: dmTemplate(row) })}>reset to template</Button>
                </div>
              </div>
            ) : null}

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
                  <Field id={`${row.projectId}-name`} label="last name note" help="Only when the maker genuinely has no last name (or QI cleared it). Say they confirmed it and paste the Slack link as proof. This is added to the justification.">
                    <Textarea rows={2} value={values.nameJustification} onChange={(event) => set(row, "nameJustification", event.target.value)} />
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