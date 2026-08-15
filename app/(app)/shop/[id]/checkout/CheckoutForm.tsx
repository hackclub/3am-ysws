"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

import styles from "./CheckoutForm.module.css";

export type CheckoutDefaults = { fullName: string; email: string };

export function CheckoutForm({ itemId, defaults }: { itemId: string; defaults: CheckoutDefaults }) {
  const router = useRouter();
  const ids = useId();

  const [fullName, setFullName] = useState(defaults.fullName);
  const [email, setEmail] = useState(defaults.email);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);
  const [working, setWorking] = useState(false);

  const errorFor = (field: string) => (problem?.field === field ? problem.message : undefined);

  async function place() {
    setWorking(true);
    setProblem(null);

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        fullName,
        email,
        addressLine1,
        addressLine2,
        city,
        postcode,
        country,
      }),
    });

    if (response.ok) {
      router.push("/dash/orders");
      router.refresh();
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { field?: string; message?: string };
    setProblem({ field: body.field, message: body.message ?? "That did not go through." });
    setWorking(false);
  }

  return (
    <div className={styles.form}>
      {problem && !problem.field ? <Banner tone="bad">{problem.message}</Banner> : null}

      <div className={styles.row}>
        <Field id={`${ids}-name`} label="full name" error={errorFor("fullName")}>
          <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </Field>
        <Field id={`${ids}-email`} label="email" error={errorFor("email")}>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
      </div>

      <Field id={`${ids}-line1`} label="address" error={errorFor("addressLine1")}>
        <Input
          value={addressLine1}
          placeholder="street and number"
          onChange={(event) => setAddressLine1(event.target.value)}
        />
      </Field>

      <Field id={`${ids}-line2`} label="address line 2">
        <Input
          value={addressLine2}
          placeholder="flat, building, optional"
          onChange={(event) => setAddressLine2(event.target.value)}
        />
      </Field>

      <div className={styles.row}>
        <Field id={`${ids}-city`} label="city" error={errorFor("city")}>
          <Input value={city} onChange={(event) => setCity(event.target.value)} />
        </Field>
        <Field id={`${ids}-postcode`} label="postcode" error={errorFor("postcode")}>
          <Input value={postcode} onChange={(event) => setPostcode(event.target.value)} />
        </Field>
        <Field id={`${ids}-country`} label="country" error={errorFor("country")}>
          <Input value={country} onChange={(event) => setCountry(event.target.value)} />
        </Field>
      </div>

      <Button onClick={place} loading={working} loadingLabel="claiming…">
        claim it
      </Button>
      <p className={styles.note}>Only used to post your grant, and only organizers can see it.</p>
    </div>
  );
}
