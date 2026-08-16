"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";

import styles from "./page.module.css";

const OPTIONS = [
  { key: "approved", label: "approve" },
  { key: "changes", label: "ask for changes" },
  { key: "rejected", label: "not approved" },
] as const;

export function DecisionForm({ id, trackedProjects }: { id: string; trackedProjects: number }) {
  const router = useRouter();
  const ids = useId();

  const [decision, setDecision] = useState<string>("approved");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);
  const [working, setWorking] = useState(false);

  const errorFor = (field: string) => (problem?.field === field ? problem.message : undefined);

  async function record() {
    setWorking(true);
    setProblem(null);

    const response = await fetch(`/api/admin/ships/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        approvedHours: Number(hours),
        noteToMaker: note,
      }),
    });

    if (response.ok) {
      router.refresh();
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { field?: string; message?: string };
    setProblem({ field: body.field, message: body.message ?? "That did not save." });
    setWorking(false);
  }

  return (
    <div className={styles.form}>
      {problem && !problem.field ? <Banner tone="bad">{problem.message}</Banner> : null}

      <div className={styles.choices} role="group" aria-label="decision">
        {OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={styles.choice}
            aria-pressed={decision === option.key}
            onClick={() => setDecision(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {decision === "approved" ? (
        <Field
          id={`${ids}-hours`}
          label="hours to approve"
          help={`They picked ${trackedProjects} Hackatime ${trackedProjects === 1 ? "project" : "projects"}.`}
          error={errorFor("approvedHours")}
        >
          <Input
            value={hours}
            inputMode="decimal"
            placeholder="12"
            onChange={(event) => setHours(event.target.value)}
          />
        </Field>
      ) : null}

      <Field
        id={`${ids}-note`}
        label="note to the maker"
        help="This is the only thing they see. Say what to fix."
        error={errorFor("noteToMaker")}
      >
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>

      <Button onClick={record} loading={working} loadingLabel="saving…">
        record decision
      </Button>
    </div>
  );
}
