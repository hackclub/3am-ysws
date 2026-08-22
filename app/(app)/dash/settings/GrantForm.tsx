"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import type { GrantDetails } from "@/lib/grant";

import styles from "./page.module.css";

export function GrantForm({ details }: { details: GrantDetails }) {
  const router = useRouter();
  const ids = useId();
  const [form, setForm] = useState(details);
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(key: keyof GrantDetails, value: string) {
    setForm({ ...form, [key]: value });
    setSaved(false);
  }

  const errorFor = (field: string) => (problem?.field === field ? problem.message : undefined);

  async function save() {
    setBusy(true);
    setProblem(null);

    const response = await fetch("/api/me/grant", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setBusy(false);

    if (response.ok) {
      setSaved(true);
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
        <Field id={`${ids}-first`} label="first name" error={errorFor("firstName")}>
          <Input
            value={form.firstName}
            onChange={(event) => set("firstName", event.target.value)}
          />
        </Field>
        <Field id={`${ids}-last`} label="last name" error={errorFor("lastName")}>
          <Input value={form.lastName} onChange={(event) => set("lastName", event.target.value)} />
        </Field>
      </div>

      <Field
        id={`${ids}-birthday`}
        label="date of birth"
        help="We only use this to show you were under 18 when you shipped."
        error={errorFor("birthday")}
      >
        <Input
          type="date"
          value={form.birthday}
          onChange={(event) => set("birthday", event.target.value)}
        />
      </Field>

      <div className={styles.line}>
        <Button onClick={save} loading={busy} loadingLabel="saving…">
          save details
        </Button>
        {saved ? <span className={styles.savedNote}>saved</span> : null}
      </div>
    </div>
  );
}
