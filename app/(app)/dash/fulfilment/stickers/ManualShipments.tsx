"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { StatusWord } from "@/components/ui/StatusWord";
import type { Tone } from "@/lib/status";
import type { ManualShipmentView } from "@/lib/fulfilment/manual-shipments";

import styles from "./ManualShipments.module.css";

type Shipment = ManualShipmentView;
type Status = Shipment["status"];
type Filter = "open" | Status | "all";

const STATUS: Record<Status, { word: string; tone: Tone }> = {
  packing: { word: "packing", tone: "warn" },
  posted: { word: "posted", tone: "info" },
  delivered: { word: "delivered", tone: "ok" },
};

const EMPTY = {
  recipientName: "", recipientEmail: "", slackId: "", itemName: "Stickers",
  addressLine1: "", addressLine2: "", city: "", stateProvince: "", postcode: "", country: "India",
  courier: "", tracking: "", notes: "",
};
type FormState = typeof EMPTY;
type Draft = { courier: string; tracking: string; notes: string };
type Message = { tone: "ok" | "bad" | "warn"; text: string };

const STALE_SEND_MS = 2 * 60 * 1000;
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const shortFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const when = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : null);

function addressLines(s: Shipment) {
  const cityLine = [[s.city, s.stateProvince].filter(Boolean).join(", "), s.postcode].filter(Boolean).join(" ");
  return [s.addressLine1, s.addressLine2, cityLine, s.country].filter((line): line is string => Boolean(line));
}

function notifyState(s: Shipment): { text: string; tone: Tone; canResend: boolean } {
  if (!s.slackId) return { text: "No Slack ID, so no DM", tone: "muted", canResend: false };
  if (s.notifyStatus === "sent") return { text: `DM sent ${when(s.notifiedAt) ?? ""}`.trim(), tone: "ok", canResend: true };
  if (s.notifyStatus === "failed") return { text: "DM failed to send", tone: "bad", canResend: s.status !== "packing" };
  if (s.notifyStatus === "sending") {
    const stale = !s.notifyAttemptedAt || Date.now() - Date.parse(s.notifyAttemptedAt) > STALE_SEND_MS;
    return { text: stale ? "DM result unknown" : "DM sending", tone: stale ? "warn" : "queued", canResend: stale && s.status !== "packing" };
  }
  if (s.status === "packing") return { text: "DM goes out when posted", tone: "muted", canResend: false };
  return { text: "No DM sent", tone: "warn", canResend: true };
}

function toForm(s: Shipment): FormState {
  return {
    recipientName: s.recipientName, recipientEmail: s.recipientEmail, slackId: s.slackId ?? "", itemName: s.itemName,
    addressLine1: s.addressLine1, addressLine2: s.addressLine2 ?? "", city: s.city, stateProvince: s.stateProvince ?? "",
    postcode: s.postcode, country: s.country, courier: s.courier ?? "", tracking: s.tracking ?? "", notes: s.notes ?? "",
  };
}

async function request(url: string, method: string, payload: unknown) {
  try {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = (await response.json().catch(() => ({}))) as { message?: string; field?: string; shipment?: Shipment; notification?: "sent" | "failed" | null };
    return { ok: response.ok, status: response.status, body };
  } catch {
    return { ok: false, status: 0, body: { message: "Network error. The change was not confirmed; refresh before trying again." } as { message?: string; field?: string; shipment?: Shipment; notification?: null } };
  }
}

function Fields({ form, set, idPrefix, withShipping }: { form: FormState; set: (key: keyof FormState, value: string) => void; idPrefix: string; withShipping: boolean }) {
  const field = (key: keyof FormState, label: string, props: Record<string, unknown> = {}, wide = false) => (
    <label className={wide ? styles.wide : undefined} htmlFor={`${idPrefix}-${key}`}>
      <span>{label}</span>
      <input id={`${idPrefix}-${key}`} value={form[key]} onChange={(e) => set(key, e.target.value)} {...props} />
    </label>
  );
  return (
    <div className={styles.grid}>
      {field("recipientName", "Recipient name", { required: true, maxLength: 160, autoComplete: "off" })}
      {field("recipientEmail", "Recipient email", { required: true, type: "email", maxLength: 254, autoComplete: "off" })}
      {field("slackId", "Slack member ID (optional)", { placeholder: "U0123ABCD", maxLength: 30, autoComplete: "off", spellCheck: false })}
      <label htmlFor={`${idPrefix}-itemName`}>
        <span>Item</span>
        <select id={`${idPrefix}-itemName`} value={form.itemName} onChange={(e) => set("itemName", e.target.value)}>
          <option>Stickers</option>
          <option>3AM Swag Kit</option>
        </select>
      </label>
      {field("addressLine1", "Address line 1", { required: true, maxLength: 300 }, true)}
      {field("addressLine2", "Address line 2", { maxLength: 300 }, true)}
      {field("city", "City", { required: true, maxLength: 120 })}
      {field("stateProvince", "State / province", { maxLength: 120 })}
      {field("postcode", "Postal code", { required: true, maxLength: 40 })}
      {field("country", "Country", { required: true, maxLength: 100 })}
      {withShipping ? (
        <>
          {field("courier", "Courier", { maxLength: 120, placeholder: "India Post, Delhivery…" })}
          {field("tracking", "Tracking ID", { maxLength: 200, spellCheck: false })}
          <label className={styles.wide} htmlFor={`${idPrefix}-notes`}>
            <span>Internal notes</span>
            <textarea id={`${idPrefix}-notes`} rows={2} maxLength={2000} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </label>
        </>
      ) : null}
    </div>
  );
}

export function ManualShipments({ shipments, limit }: { shipments: Shipment[]; limit: number }) {
  const router = useRouter();
  const [items, setItems] = useState(shipments);
  const [filter, setFilter] = useState<Filter>("open");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY);
  const [copied, setCopied] = useState<string | null>(null);

  // Server data wins after a refresh (state adjusted during render, as React recommends).
  const [seen, setSeen] = useState(shipments);
  if (seen !== shipments) { setSeen(shipments); setItems(shipments); }

  const counts = useMemo(() => {
    const c = { packing: 0, posted: 0, delivered: 0 };
    for (const s of items) c[s.status] += 1;
    return c;
  }, [items]);

  const needle = query.trim().toLocaleLowerCase();
  const visible = useMemo(() => items.filter((s) => {
    if (filter === "open" && s.status === "delivered") return false;
    if (filter !== "open" && filter !== "all" && s.status !== filter) return false;
    if (!needle) return true;
    return [s.recipientName, s.recipientEmail, s.slackId, s.itemName, s.city, s.postcode, s.country, s.courier, s.tracking, s.notes, s.id]
      .some((v) => String(v ?? "").toLocaleLowerCase().includes(needle));
  }), [items, filter, needle]);

  const draftOf = (s: Shipment): Draft => drafts[s.id] ?? { courier: s.courier ?? "", tracking: s.tracking ?? "", notes: s.notes ?? "" };
  const setDraft = (s: Shipment, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [s.id]: { ...draftOf(s), ...patch } }));
  const clearDraft = (id: string) => setDrafts((d) => { const next = { ...d }; delete next[id]; return next; });
  const say = (id: string, message: Message | null) => setMessages((m) => { const next = { ...m }; if (message) next[id] = message; else delete next[id]; return next; });
  const replace = (s: Shipment) => setItems((list) => list.map((x) => (x.id === s.id ? s : x)));

  async function copy(key: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(key); }
    catch { setCopied(`${key}:failed`); }
    window.setTimeout(() => setCopied((c) => (c && c.startsWith(key) ? null : c)), 1800);
  }
  const copyLabel = (key: string, label: string) => (copied === key ? "copied" : copied === `${key}:failed` ? "clipboard blocked" : label);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const res = await request("/api/admin/manual-shipments", "POST", form);
    setSaving(false);
    if (!res.ok || !res.body.shipment) {
      setFormError(res.body.message ?? "The shipment could not be created.");
      return;
    }
    const created = res.body.shipment;
    setItems((list) => [created, ...list]);
    setForm(EMPTY);
    setCreating(false);
    setFilter("open");
    setOpenId(created.id);
    say(created.id, { tone: "ok", text: "Shipment created." });
    router.refresh();
  }

  async function update(s: Shipment, payload: Record<string, unknown>, done: string) {
    setBusyId(s.id);
    say(s.id, null);
    const res = await request(`/api/admin/manual-shipments/${s.id}`, "PATCH", { ...payload, expectedUpdatedAt: s.updatedAt });
    setBusyId(null);
    if (res.body.shipment) replace(res.body.shipment);
    if (!res.ok) {
      if (res.status === 409 && res.body.shipment) clearDraft(s.id);
      say(s.id, { tone: "bad", text: res.body.message ?? "That did not save." });
      return false;
    }
    if (res.body.notification === "failed") say(s.id, { tone: "warn", text: `${done} The Slack DM failed; the shipment is saved. You can resend it.` });
    else if (res.body.notification === "sent") say(s.id, { tone: "ok", text: `${done} DM sent on Slack.` });
    else say(s.id, { tone: "ok", text: done });
    router.refresh();
    return true;
  }

  function shippingChanges(s: Shipment) {
    const d = draftOf(s);
    const out: Record<string, string> = {};
    if (d.courier.trim() !== (s.courier ?? "")) out.courier = d.courier;
    if (d.tracking.trim() !== (s.tracking ?? "")) out.tracking = d.tracking;
    if (d.notes.trim() !== (s.notes ?? "")) out.notes = d.notes;
    return out;
  }

  async function saveShipping(s: Shipment) {
    if (await update(s, shippingChanges(s), "Saved.")) clearDraft(s.id);
  }

  async function setStatus(s: Shipment, status: Status, done: string) {
    // Unsaved courier and tracking go with the status change so the DM includes them.
    const ok = await update(s, { ...shippingChanges(s), status }, done);
    if (ok) { clearDraft(s.id); setConfirmId(null); }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>, s: Shipment) {
    event.preventDefault();
    const details: Partial<FormState> = { ...editForm };
    delete details.courier; delete details.tracking; delete details.notes;
    if (await update(s, details, "Details saved.")) setEditId(null);
  }

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "open", label: "to do", count: counts.packing + counts.posted },
    { id: "packing", label: "packing", count: counts.packing },
    { id: "posted", label: "posted", count: counts.posted },
    { id: "delivered", label: "delivered", count: counts.delivered },
    { id: "all", label: "all", count: items.length },
  ];

  return (
    <section className={styles.section} aria-labelledby="manual-title">
      <header className={styles.heading}>
        <div>
          <h2 id="manual-title">Manual shipments</h2>
          <p>Stickers and swag sent outside the shop. Separate from shop orders: no beans, payments or order totals change.</p>
        </div>
        <Button variant={creating ? "quiet" : "primary"} onClick={() => { setCreating((v) => !v); setFormError(null); }} aria-expanded={creating}>
          {creating ? "close form" : "+ new shipment"}
        </Button>
      </header>

      {creating ? (
        <form className={styles.form} onSubmit={create} aria-label="New manual shipment">
          <Fields form={form} set={(k, v) => setForm((f) => ({ ...f, [k]: v }))} idPrefix="new" withShipping />
          {formError ? <p className={styles.error} role="alert">{formError}</p> : null}
          <div className={styles.formActions}>
            <Button variant="quiet" type="button" onClick={() => setCreating(false)} disabled={saving}>cancel</Button>
            <Button type="submit" loading={saving} loadingLabel="saving…">create shipment</Button>
          </div>
        </form>
      ) : null}

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist" aria-label="Filter manual shipments">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={filter === t.id} className={filter === t.id ? styles.tabOn : styles.tab} onClick={() => setFilter(t.id)}>
              {t.label} <span>{t.count}</span>
            </button>
          ))}
        </div>
        <input className={styles.search} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, Slack ID, tracking, city…" aria-label="Search manual shipments" />
      </div>

      {items.length >= limit ? <p className={styles.hint}>Showing the {limit} most recent shipments.</p> : null}

      {visible.length === 0 ? (
        <p className={styles.empty}>{items.length === 0 ? "No manual shipments yet. Add one when you send stickers or a swag kit outside the shop." : "Nothing matches this filter."}</p>
      ) : (
        <div className={styles.table}>
          <div className={styles.thead} aria-hidden="true">
            <span>recipient</span><span>item</span><span>destination</span><span>tracking</span><span>status</span><span>created</span><span />
          </div>
          <ul className={styles.rows}>
            {visible.map((s) => {
              const open = openId === s.id;
              const busy = busyId === s.id;
              const meta = STATUS[s.status];
              const n = notifyState(s);
              const d = draftOf(s);
              const dirty = Object.keys(shippingChanges(s)).length > 0;
              const msg = messages[s.id];
              const block = [s.recipientName, ...addressLines(s)].join("\n");
              return (
                <li key={s.id} className={open ? styles.rowOpen : styles.row}>
                  <button type="button" className={styles.summary} aria-expanded={open} aria-controls={`ship-${s.id}`} onClick={() => { setOpenId(open ? null : s.id); setConfirmId(null); }}>
                    <span className={styles.who}><b>{s.recipientName}</b><small>{s.recipientEmail}</small></span>
                    <span className={styles.cell}>{s.itemName}</span>
                    <span className={styles.cell}>{[s.city, s.country].filter(Boolean).join(", ")}</span>
                    <span className={styles.mono}>{s.tracking ? `${s.courier ? `${s.courier} · ` : ""}${s.tracking}` : <em>no tracking</em>}</span>
                    <span><StatusWord tone={meta.tone} size="s">{meta.word}</StatusWord></span>
                    <span className={styles.mono}>{shortFmt.format(new Date(s.createdAt))}</span>
                    <span className={styles.chev} aria-hidden="true">{open ? "−" : "+"}</span>
                  </button>

                  {open ? (
                    <div className={styles.detail} id={`ship-${s.id}`}>
                      {msg ? <p className={styles[msg.tone]} role="status">{msg.text}</p> : null}

                      {editId === s.id ? (
                        <form className={styles.form} onSubmit={(e) => saveEdit(e, s)} aria-label={`Edit ${s.recipientName}`}>
                          <Fields form={editForm} set={(k, v) => setEditForm((f) => ({ ...f, [k]: v }))} idPrefix={`edit-${s.id}`} withShipping={false} />
                          <div className={styles.formActions}>
                            <Button variant="quiet" type="button" onClick={() => setEditId(null)} disabled={busy}>cancel</Button>
                            <Button type="submit" loading={busy} loadingLabel="saving…">save details</Button>
                          </div>
                        </form>
                      ) : (
                        <div className={styles.cols}>
                          <div className={styles.block}>
                            <h3>Ship to</h3>
                            <address className={styles.address}>{block}</address>
                            <dl className={styles.kv}>
                              <dt>Email</dt><dd>{s.recipientEmail}</dd>
                              <dt>Slack</dt><dd>{s.slackId ?? "not set"}</dd>
                            </dl>
                            <div className={styles.copyRow}>
                              <button type="button" onClick={() => copy(`${s.id}:block`, block)}>{copyLabel(`${s.id}:block`, "copy label")}</button>
                              <button type="button" onClick={() => copy(`${s.id}:addr`, addressLines(s).join(", "))}>{copyLabel(`${s.id}:addr`, "copy address")}</button>
                              <button type="button" onClick={() => copy(`${s.id}:email`, s.recipientEmail)}>{copyLabel(`${s.id}:email`, "copy email")}</button>
                              <button type="button" onClick={() => { setEditForm(toForm(s)); setEditId(s.id); setConfirmId(null); }}>edit details</button>
                            </div>
                          </div>

                          <div className={styles.block}>
                            <h3>Shipment</h3>
                            <p className={styles.itemLine}>{s.itemName}</p>
                            <div className={styles.inline}>
                              <label htmlFor={`courier-${s.id}`}><span>Courier</span>
                                <input id={`courier-${s.id}`} value={d.courier} maxLength={120} onChange={(e) => setDraft(s, { courier: e.target.value })} disabled={busy} />
                              </label>
                              <label htmlFor={`tracking-${s.id}`}><span>Tracking ID</span>
                                <span className={styles.withCopy}>
                                  <input id={`tracking-${s.id}`} value={d.tracking} maxLength={200} spellCheck={false} onChange={(e) => setDraft(s, { tracking: e.target.value })} disabled={busy} />
                                  {s.tracking ? <button type="button" onClick={() => copy(`${s.id}:trk`, s.tracking ?? "")}>{copyLabel(`${s.id}:trk`, "copy")}</button> : null}
                                </span>
                              </label>
                            </div>
                            <label htmlFor={`notes-${s.id}`} className={styles.notes}><span>Internal notes</span>
                              <textarea id={`notes-${s.id}`} rows={2} maxLength={2000} value={d.notes} onChange={(e) => setDraft(s, { notes: e.target.value })} disabled={busy} />
                            </label>
                            {dirty ? (
                              <div className={styles.formActions}>
                                <Button variant="quiet" onClick={() => clearDraft(s.id)} disabled={busy}>discard</Button>
                                <Button onClick={() => saveShipping(s)} loading={busy} loadingLabel="saving…">save</Button>
                              </div>
                            ) : null}
                          </div>

                          <div className={styles.block}>
                            <h3>Progress</h3>
                            <ol className={styles.timeline}>
                              <li className={styles.done}><b>Created</b><span>{when(s.createdAt)}{s.createdBy ? ` · ${s.createdBy}` : ""}</span></li>
                              <li className={s.dispatchedAt ? styles.done : undefined}><b>Posted</b><span>{when(s.dispatchedAt) ?? "not yet"}</span></li>
                              <li className={s.deliveredAt ? styles.done : undefined}><b>Delivered</b><span>{when(s.deliveredAt) ?? "not yet"}</span></li>
                            </ol>
                            <div className={styles.notify}>
                              <StatusWord tone={n.tone} size="s">{n.text}</StatusWord>
                              {n.canResend && s.slackId ? (
                                <button type="button" className={styles.linkish} disabled={busy} onClick={() => update(s, { resendNotification: true }, "Resent.")}>
                                  {s.notifyStatus === "sent" ? "send again" : "send DM"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )}

                      {editId !== s.id ? (
                        confirmId === s.id ? (
                          <div className={styles.confirm} role="group" aria-label="Confirm dispatch">
                            <p>
                              Mark as posted{d.tracking.trim() ? ` with tracking ${d.tracking.trim()}` : " without tracking"}.{" "}
                              {s.slackId
                                ? s.notifiedAt ? "A DM was already sent before, so none goes out now." : `${s.recipientName.split(" ")[0]} gets a Slack DM.`
                                : "No Slack ID, so no DM."}
                            </p>
                            <div className={styles.formActions}>
                              <Button variant="quiet" onClick={() => setConfirmId(null)} disabled={busy}>back</Button>
                              <Button onClick={() => setStatus(s, "posted", "Marked posted.")} loading={busy} loadingLabel="posting…">confirm posted</Button>
                            </div>
                          </div>
                        ) : (
                          <div className={styles.actions}>
                            {s.status === "packing" ? <Button onClick={() => setConfirmId(s.id)} disabled={busy}>mark posted</Button> : null}
                            {s.status === "posted" ? <Button onClick={() => setStatus(s, "delivered", "Marked delivered.")} loading={busy} loadingLabel="saving…">mark delivered</Button> : null}
                            {s.status === "posted" ? <Button variant="quiet" onClick={() => setStatus(s, "packing", "Moved back to packing.")} disabled={busy}>back to packing</Button> : null}
                            {s.status === "delivered" ? <Button variant="quiet" onClick={() => setStatus(s, "posted", "Moved back to posted.")} disabled={busy}>not delivered yet</Button> : null}
                          </div>
                        )
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {items.length > 0 && visible.length > 0 ? <p className={styles.hint}>{visible.length} of {items.length} shown</p> : null}
    </section>
  );
}
