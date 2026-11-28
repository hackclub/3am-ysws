"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ManualShipment } from "@/lib/db/schema";

import styles from "./ManualShipments.module.css";

type Props = { shipments: ManualShipment[] };

export function ManualShipments({ shipments }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [form, setForm] = useState({
    recipientName: "", recipientEmail: "", slackId: "", itemName: "Stickers",
    addressLine1: "", addressLine2: "", city: "", stateProvince: "", postcode: "", country: "India",
    courier: "", tracking: "", notes: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setProblem("");
    try {
      const response = await fetch("/api/admin/manual-shipments", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Could not create shipment.");
      setForm({ recipientName: "", recipientEmail: "", slackId: "", itemName: "Stickers", addressLine1: "", addressLine2: "", city: "", stateProvince: "", postcode: "", country: "India", courier: "", tracking: "", notes: "" });
      setOpen(false);
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Network error.");
    } finally { setBusy(false); }
  }

  async function updateShipment(id: string, payload: Record<string, string>) {
    setBusy(true);
    setProblem("");
    try {
      const response = await fetch(`/api/admin/manual-shipments/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Could not update shipment.");
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Network error.");
    } finally { setBusy(false); }
  }

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div><h2>Manual shipments <span className={styles.count}>{shipments.length}</span></h2>
          <p>Independent of shop orders. These entries do not affect beans, payments or order totals.</p></div>
        <button type="button" className={styles.primary} onClick={() => setOpen((value) => !value)}>＋ Add manual shipment</button>
      </div>

      {problem ? <p className={styles.error} role="alert">{problem}</p> : null}
      {open ? (
        <form className={styles.form} onSubmit={createShipment}>
          <h3>New manual shipment</h3>
          <div className={styles.grid}>
            <label>Recipient name<input required value={form.recipientName} onChange={(e) => set("recipientName", e.target.value)} /></label>
            <label>Recipient email<input required type="email" value={form.recipientEmail} onChange={(e) => set("recipientEmail", e.target.value)} /></label>
            <label>Slack member ID (optional)<input placeholder="U…" value={form.slackId} onChange={(e) => set("slackId", e.target.value)} /></label>
            <label>Item<select value={form.itemName} onChange={(e) => set("itemName", e.target.value)}><option>Stickers</option><option>3AM Swag Kit</option></select></label>
            <label className={styles.wide}>Address line 1<input required value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} /></label>
            <label className={styles.wide}>Address line 2<input value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} /></label>
            <label>City<input required value={form.city} onChange={(e) => set("city", e.target.value)} /></label>
            <label>State / province<input value={form.stateProvince} onChange={(e) => set("stateProvince", e.target.value)} /></label>
            <label>Postal code<input required value={form.postcode} onChange={(e) => set("postcode", e.target.value)} /></label>
            <label>Country<input required value={form.country} onChange={(e) => set("country", e.target.value)} /></label>
            <label>Courier<input value={form.courier} onChange={(e) => set("courier", e.target.value)} /></label>
            <label>Tracking ID<input value={form.tracking} onChange={(e) => set("tracking", e.target.value)} /></label>
            <label className={styles.wide}>Internal notes<textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></label>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
            <button type="submit" className={styles.primary} disabled={busy}>{busy ? "Saving…" : "Create shipment"}</button>
          </div>
        </form>
      ) : null}

      {shipments.length === 0 ? <p className={styles.empty}>No manual shipments yet.</p> : (
        <div className={styles.list}>
          {shipments.map((shipment) => (
            <article className={styles.shipment} key={shipment.id}>
              <div className={styles.top}>
                <div><strong>{shipment.itemName}</strong><span className={styles.manual}>MANUAL</span><p>{shipment.recipientName} · {shipment.recipientEmail}</p></div>
                <span className={styles.status}>{shipment.status.replace("_", " ")}</span>
              </div>
              <p className={styles.address}>{[shipment.addressLine1, shipment.addressLine2, shipment.city, shipment.stateProvince, shipment.postcode, shipment.country].filter(Boolean).join(", ")}</p>
              {shipment.notes ? <p className={styles.notes}>Notes: {shipment.notes}</p> : null}
              <div className={styles.controls}>
                <label>Courier<input key={shipment.id + "courier"} defaultValue={shipment.courier ?? ""} onBlur={(e) => { if (e.target.value !== (shipment.courier ?? "")) void updateShipment(shipment.id, { courier: e.target.value }); }} /></label>
                <label>Tracking ID<input key={shipment.id + "tracking"} defaultValue={shipment.tracking ?? ""} onBlur={(e) => { if (e.target.value !== (shipment.tracking ?? "")) void updateShipment(shipment.id, { tracking: e.target.value }); }} /></label>
                <label>Status<select value={shipment.status} disabled={busy} onChange={(e) => void updateShipment(shipment.id, { status: e.target.value })}><option value="packing">Packing</option><option value="posted">Posted / dispatched</option><option value="delivered">Delivered</option></select></label>
              </div>
              {shipment.slackId ? <small className={styles.slack}>Slack DM enabled · {shipment.slackId}</small> : <small className={styles.slack}>No Slack ID — dispatch DM disabled</small>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
