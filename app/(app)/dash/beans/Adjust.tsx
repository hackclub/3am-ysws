"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

import styles from "./Adjust.module.css";

export function Adjust({ userSub, name }: { userSub: string; name: string }) {
  const router = useRouter();
  const ids = useId();
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const errorFor = (field: string) => (problem?.field === field ? problem.message : undefined);

  async function save() {
    setBusy(true);
    setProblem(null);

    const response = await fetch("/api/admin/beans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userSub, delta: Number(delta), note }),
    });

    setBusy(false);

    if (response.ok) {
      setDelta("");
      setNote("");
      router.refresh();
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { field?: string; message?: string };
    setProblem({ field: body.field, message: body.message ?? "That did not save." });
  }

  return (
    <div className={styles.form}>
      {problem && !problem.field ? <Banner tone="bad">{problem.message}</Banner> : null}
      <div className={styles.row}>
        <Field
          id={`${ids}-delta`}
          label="beans"
          help="Negative takes them away."
          error={errorFor("delta")}
        >
          <Input
            value={delta}
            inputMode="numeric"
            placeholder="10"
            onChange={(event) => setDelta(event.target.value)}
          />
        </Field>
        <Field
          id={`${ids}-note`}
          label="why"
          help="Goes in the ledger forever."
          error={errorFor("note")}
        >
          <Input value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </div>
      <Button onClick={save} loading={busy} loadingLabel="saving…">
        adjust {name}
      </Button>
    </div>
  );
}
