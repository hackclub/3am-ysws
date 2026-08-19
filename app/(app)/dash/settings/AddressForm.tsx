"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import type { Address } from "@/lib/address";

import styles from "./page.module.css";

export function AddressForm({ address }: { address: Address }) {
  const router = useRouter();
  const ids = useId();
  const [form, setForm] = useState(address);
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(key: keyof Address, value: string) {
    setForm({ ...form, [key]: value });
    setSaved(false);
  }

  const errorFor = (field: string) => (problem?.field === field ? problem.message : undefined);

  async function save() {
    setBusy(true);
    setProblem(null);

    const response = await fetch("/api/me/address", {
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
    <div className={styles.addressForm}>
      {problem && !problem.field ? <Banner tone="bad">{problem.message}</Banner> : null}

      <Field id={`${ids}-name`} label="name for the parcel" error={errorFor("fullName")}>
        <Input value={form.fullName} onChange={(event) => set("fullName", event.target.value)} />
      </Field>

      <Field id={`${ids}-line1`} label="address" error={errorFor("addressLine1")}>
        <Input
          value={form.addressLine1}
          placeholder="street and number"
          onChange={(event) => set("addressLine1", event.target.value)}
        />
      </Field>

      <Field id={`${ids}-line2`} label="address line 2">
        <Input
          value={form.addressLine2}
          placeholder="flat, building, optional"
          onChange={(event) => set("addressLine2", event.target.value)}
        />
      </Field>

      <div className={styles.row}>
        <Field id={`${ids}-city`} label="city" error={errorFor("city")}>
          <Input value={form.city} onChange={(event) => set("city", event.target.value)} />
        </Field>
        <Field id={`${ids}-postcode`} label="postcode" error={errorFor("postcode")}>
          <Input value={form.postcode} onChange={(event) => set("postcode", event.target.value)} />
        </Field>
        <Field id={`${ids}-country`} label="country" error={errorFor("country")}>
          <Input value={form.country} onChange={(event) => set("country", event.target.value)} />
        </Field>
      </div>

      <div className={styles.line}>
        <Button onClick={save} loading={busy} loadingLabel="saving…">
          save address
        </Button>
        {saved ? <span className={styles.savedNote}>saved</span> : null}
      </div>
    </div>
  );
}
