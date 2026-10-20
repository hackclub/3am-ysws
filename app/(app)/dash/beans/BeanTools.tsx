"use client";

import { useMemo, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Adjust } from "./Adjust";
import styles from "./BeanTools.module.css";

type Maker = { sub: string; name: string; email: string; slackId: string; balance: number };

export function BeanTools({ makers }: { makers: Maker[] }) {
  const [query, setQuery] = useState("");
  const [selectedSub, setSelectedSub] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "bad"; message: string } | null>(null);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return makers.filter((maker) =>
      [maker.name, maker.email, maker.slackId, maker.sub].some((value) => value.toLowerCase().includes(needle)),
    ).slice(0, 8);
  }, [makers, query]);

  const selected = makers.find((maker) => maker.sub === selectedSub) ?? null;

  async function send(mode: "remind_all" | "custom") {
    if (mode === "custom" && (!selected || !message.trim())) {
      setStatus({ tone: "bad", message: "Choose a maker and write a message first." });
      return;
    }
    const prompt = mode === "remind_all"
      ? "Send a Slack DM reminder to every maker with a positive bean balance and a Slack ID?"
      : `Send this Slack DM to ${selected?.name}?\n\n${message.trim()}`;
    if (!window.confirm(prompt)) return;

    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/beans/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "remind_all"
          ? { mode }
          : { mode, userSub: selected?.sub, message: message.trim() }),
      });
      const body = (await response.json().catch(() => ({}))) as { sent?: number; skipped?: number; message?: string };
      if (!response.ok) {
        setStatus({ tone: "bad", message: body.message ?? "Could not send the Slack message." });
      } else {
        setStatus({
          tone: "ok",
          message: mode === "remind_all"
            ? `Bean reminders sent to ${body.sent ?? 0} makers. ${body.skipped ?? 0} skipped (no Slack ID or delivery failed).`
            : `DM sent to ${selected?.name}.`,
        });
        setMessage("");
      }
    } catch {
      setStatus({ tone: "bad", message: "Network error. Check the connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.tools}>
      {status ? <Banner tone={status.tone === "ok" ? "ok" : "bad"}>{status.message}</Banner> : null}
      <label className={styles.searchLabel} htmlFor="bean-maker-search">Search name, email, Slack ID, or user ID</label>
      <input
        id="bean-maker-search"
        className={styles.search}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Start typing a maker's name or email…"
        autoComplete="off"
      />
      {query.trim() ? (
        <div className={styles.results}>
          {matches.length ? matches.map((maker) => (
            <button
              type="button"
              key={maker.sub}
              className={`${styles.result} ${selectedSub === maker.sub ? styles.resultSelected : ""}`}
              onClick={() => { setSelectedSub(maker.sub); setStatus(null); }}
            >
              <span><strong>{maker.name}</strong><small>{maker.email} · {maker.slackId || "No Slack ID"}</small></span>
              <span className={styles.balance}>{maker.balance.toLocaleString("en-US")} beans</span>
            </button>
          )) : <p className={styles.help}>No makers match that search.</p>}
          {matches.length === 8 ? <p className={styles.help}>Showing the first 8 matches. Refine your search.</p> : null}
        </div>
      ) : <p className={styles.help}>Search here to edit a balance or message a maker without scrolling through the full list.</p>}

      {selected ? (
        <section className={styles.selected}>
          <div className={styles.selectedHeader}>
            <div><strong>{selected.name}</strong><small>{selected.balance.toLocaleString("en-US")} beans · {selected.slackId || "No Slack ID linked"}</small></div>
            <button type="button" className={styles.clear} onClick={() => setSelectedSub("")}>Clear</button>
          </div>
          <h3>Adjust beans</h3>
          <Adjust userSub={selected.sub} name={selected.name} />
          <div className={styles.dm}>
            <h3>Custom Slack DM</h3>
            <textarea
              className={styles.message}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write a personal message…"
              rows={4}
              maxLength={3000}
              disabled={!selected.slackId || busy}
            />
            {!selected.slackId ? <p className={styles.help}>This maker has no linked Slack ID, so DMs cannot be sent.</p> : null}
            <button type="button" className={styles.primary} disabled={busy || !selected.slackId || !message.trim()} onClick={() => send("custom")}>
              {busy ? "Sending…" : "Send custom DM"}
            </button>
          </div>
        </section>
      ) : null}

      <div className={styles.reminder}>
        <div><strong>Bean reminder blast</strong><p>DM everyone with a positive balance and a linked Slack account, nudging them to check the shop and spend their beans.</p></div>
        <button type="button" className={styles.secondary} disabled={busy} onClick={() => send("remind_all")}>
          {busy ? "Sending…" : "Remind makers to spend beans"}
        </button>
      </div>
    </div>
  );
}
