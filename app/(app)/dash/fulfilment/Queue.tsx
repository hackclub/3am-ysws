"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { OrderStatusWord } from "@/components/ui/StatusWord";
import type { Order, User } from "@/lib/db/schema";
import { orderStatusOf } from "@/lib/projects/status";

import styles from "./Queue.module.css";

export type QueueRow = { order: Order; maker: User };

function beanCents(value: number | string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function formatBeans(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function Queue({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [canceling, setCanceling] = useState<string | null>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [search, setSearch] = useState("");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [orderCopyMessages, setOrderCopyMessages] = useState<Record<string, string>>({});
  const [expandedMakers, setExpandedMakers] = useState<Record<string, boolean>>({});

  async function patch(id: string, payload: Record<string, unknown>) {
    setBusy(id);
    setProblem(null);
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setCanceling(null);
        setCancelNote("");
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      setProblem(body.message ?? "That did not save.");
    } catch {
      setProblem("Network error — the order was not confirmed as saved. Refresh before retrying.");
    } finally {
      setBusy(null);
    }
  }

  function startCancel(id: string) {
    setProblem(null);
    setCanceling(id);
    setCancelNote("");
  }

  function stopCancel() {
    if (busy) return;
    setCanceling(null);
    setCancelNote("");
  }

  const needle = search.trim().toLocaleLowerCase();
  const visibleRows = useMemo(
    () =>
      rows.filter(({ order, maker }) => {
        if (!needle) return true;
        return [
          order.id,
          order.itemName,
          order.status,
          order.tracking,
          order.fullName,
          order.email,
          maker.name,
          maker.slackId,
        ].some((value) => String(value ?? "").toLocaleLowerCase().includes(needle));
      }),
    [rows, needle],
  );

  const totals = useMemo(() => {
    const byMaker = new Map<string, { key: string; name: string; slackId: string; email: string; cents: number; count: number; orders: QueueRow[] }>();
    let totalCents = 0;

    for (const { order, maker } of visibleRows) {
      const cents = beanCents(order.cost);
      totalCents += cents;
      const key = maker.sub || maker.slackId || maker.name;
      const current = byMaker.get(key) ?? {
        key,
        name: maker.name || "Unknown maker",
        slackId: maker.slackId || "",
        cents: 0,
        count: 0,
      };
      current.cents += cents;
      current.count += 1;
      byMaker.set(key, current);
    }

    return {
      totalCents,
      makers: [...byMaker.values()].sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name)),
    };
  }, [visibleRows]);

  async function copyTotals() {
    const lines = [
      `Fulfilment total: ${formatBeans(totals.totalCents)} beans across ${visibleRows.length} orders`,
      ...totals.makers.map(
        (maker) => `${maker.name}${maker.slackId ? ` (@${maker.slackId})` : ""}: ${formatBeans(maker.cents)} beans — ${maker.count} order${maker.count === 1 ? "" : "s"}`,
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyMessage("Totals copied");
    } catch {
      setCopyMessage("Clipboard unavailable — select and copy the totals manually");
    }
  }

  async function copyOrderDetails(order: Order, maker: User) {
    const details = [
      `Maker: ${maker.name}`,
      `Slack: ${maker.slackId}`,
      `Email: ${maker.email || "not provided"}`,
      `Order email: ${order.email || "not provided"}`,
      `Purpose/item: ${order.itemName}`,
      `Price: ${formatBeans(beanCents(order.cost))} beans`,
      `Order ID: ${order.id}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(details);
      setOrderCopyMessages((current) => ({ ...current, [order.id]: "Copied order details" }));
    } catch {
      setOrderCopyMessages((current) => ({ ...current, [order.id]: "Clipboard unavailable" }));
    }
  }

  return (
    <>
      {problem ? <Banner tone="bad">{problem}</Banner> : null}

      <section className={styles.summary} aria-label="fulfilment totals">
        <div className={styles.summaryHead}>
          <div>
            <span className={styles.eyebrow}>current view · {visibleRows.length} of {rows.length} orders</span>
            <div className={styles.grandTotal}>{formatBeans(totals.totalCents)} <span>beans</span></div>
            <p className={styles.summaryHint}>Total value of orders matching this tab and search. Cancelled orders are included only when viewing the cancelled tab or everything.</p>
          </div>
          <div className={styles.copyAction}>
            <Button variant="quiet" onClick={copyTotals}>copy totals</Button>
            {copyMessage ? <span className={styles.copyMessage} role="status">{copyMessage}</span> : null}
          </div>
        </div>

        <label className={styles.searchLabel} htmlFor="fulfilment-search">find an order or maker</label>
        <input
          id="fulfilment-search"
          className={styles.search}
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setCopyMessage(null);
          }}
          placeholder="Search name, Slack ID, item, order ID, email, tracking…"
        />

        {totals.makers.length > 0 ? (
          <div className={styles.totalsTableWrap}>
            <table className={styles.totalsTable}>
              <thead>
                <tr>
                  <th scope="col">maker</th>
                  <th scope="col">orders</th>
                  <th scope="col">total beans</th>
                </tr>
              </thead>
              <tbody>
                {totals.makers.map((maker) => (
                  <tr key={maker.key}>
                    <td>
                      <button
                        type="button"
                        className={styles.makerFilter}
                        aria-expanded={Boolean(expandedMakers[maker.key])}
                        aria-controls={`maker-breakdown-${maker.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`}
                        onClick={() => setExpandedMakers((current) => ({ ...current, [maker.key]: !current[maker.key] }))}
                        title={`Show order breakdown for ${maker.name}`}
                      >
                        <span>{maker.name}</span>
                        {maker.email ? <small>{maker.email}</small> : <small>email unavailable</small>}
                        {maker.slackId ? <small>{maker.slackId}</small> : null}
                        <small>{expandedMakers[maker.key] ? "hide breakdown ▲" : "show breakdown ▼"}</small>
                      </button>
                      {expandedMakers[maker.key] ? (
                        <div id={`maker-breakdown-${maker.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`} className={styles.makerBreakdown}>
                          <div className={styles.makerBreakdownHead}>
                            <strong>Order breakdown</strong>
                            <span>{maker.count} orders · {formatBeans(maker.cents)} beans total</span>
                          </div>
                          {maker.orders.map(({ order }) => (
                            <div key={order.id} className={styles.makerBreakdownOrder}>
                              <div className={styles.makerBreakdownDetails}>
                                <strong>{order.itemName}</strong>
                                <span>{order.email || maker.email || "No email on order"}</span>
                                <small>{order.id}</small>
                              </div>
                              <strong className={styles.amount}>{formatBeans(beanCents(order.cost))} beans</strong>
                              <Button variant="quiet" onClick={() => copyOrderDetails(order, maker)}>copy details</Button>
                            </div>
                          ))}
                          <div className={styles.makerBreakdownFooter}>
                            <strong>Combined total</strong>
                            <strong className={styles.amount}>{formatBeans(maker.cents)} beans</strong>
                            <Button variant="quiet" onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(maker.orders.map(({ order }) => `${order.itemName} — ${formatBeans(beanCents(order.cost))} beans — ${order.email || maker.email || "no email"} — order ${order.id}`).join("\\n") + `\\nTOTAL: ${formatBeans(maker.cents)} beans`);
                                setOrderCopyMessages((current) => ({ ...current, [maker.key]: "Copied maker breakdown" }));
                              } catch {
                                setOrderCopyMessages((current) => ({ ...current, [maker.key]: "Clipboard unavailable" }));
                              }
                            }}>copy breakdown</Button>
                            {orderCopyMessages[maker.key] ? <small role="status">{orderCopyMessages[maker.key]}</small> : null}
                          </div>
                        </div>
                      ) : null}
                    </td>
                    <td>{maker.count}</td>
                    <td className={styles.amount}>{formatBeans(maker.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.none}>No orders match this search.</p>
        )}
      </section>

      {visibleRows.length === 0 ? (
        <p className={styles.none}>No orders to show. Try another search or switch the status tab.</p>
      ) : (
        visibleRows.map(({ order, maker }) => {
          const hasAddress = Boolean(order.addressLine1 && order.city && order.country);
          const working = busy === order.id;
          const isCanceling = canceling === order.id;

          return (
            <div key={order.id} className={styles.order}>
              <div className={styles.head}>
                <span>
                  <span className={styles.item}>{order.itemName}</span>
                  <span className={styles.maker}>{" "}{maker.name} · {maker.slackId} · {formatBeans(beanCents(order.cost))} beans</span>
                </span>
                <OrderStatusWord status={orderStatusOf(order.status)} size="s" />
              </div>

              {hasAddress ? (
                <span className={styles.address}>
                  {[order.fullName, order.addressLine1, order.addressLine2, `${order.city} ${order.postcode ?? ""}`.trim(), order.country, order.email].filter(Boolean).join("\n")}
                </span>
              ) : (
                <span className={[styles.address, styles.missing].join(" ")}>no address on this order, chase the maker</span>
              )}

              {order.adminNote ? <div className={styles.note}><strong>maker note:</strong> {order.adminNote}</div> : null}

              {isCanceling ? (
                <div className={styles.cancelBox}>
                  <label className={styles.cancelLabel} htmlFor={`cancel-note-${order.id}`}>
                    cancellation comment — visible to the maker
                  </label>
                  <textarea
                    id={`cancel-note-${order.id}`}
                    className={styles.cancelNote}
                    value={cancelNote}
                    onChange={(event) => setCancelNote(event.target.value)}
                    placeholder="Tell the maker why this order is being cancelled..."
                    rows={3}
                    autoFocus
                  />
                  <div className={styles.actions}>
                    <Button variant="quiet" disabled={working} onClick={stopCancel}>keep order</Button>
                    <Button
                      variant="danger"
                      loading={working}
                      disabled={!cancelNote.trim() || working}
                      onClick={() => patch(order.id, { status: "cancelled", adminNote: cancelNote.trim(), refundBeans: false })}
                    >
                      cancel — no refund
                    </Button>
                    <Button
                      variant="danger"
                      loading={working}
                      disabled={!cancelNote.trim() || working}
                      onClick={() => patch(order.id, { status: "cancelled", adminNote: cancelNote.trim(), refundBeans: true })}
                    >
                      cancel & refund
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                <div className={styles.orderCopyRow}>
                  <Button variant="quiet" onClick={() => copyOrderDetails(order, maker)}>copy email + purpose + price</Button>
                  {orderCopyMessages[order.id] ? <span className={styles.copyMessage} role="status">{orderCopyMessages[order.id]}</span> : null}
                </div>
                <div className={styles.actions}>
                  <input
                    className={styles.tracking}
                    placeholder="tracking, optional"
                    value={tracking[order.id] ?? order.tracking ?? ""}
                    onChange={(event) => setTracking({ ...tracking, [order.id]: event.target.value })}
                  />
                  <Button variant="quiet" loading={working} disabled={working} onClick={() => patch(order.id, { status: "ready_to_fulfil", tracking: tracking[order.id] ?? order.tracking ?? "" })} className={styles.ready}>✓ ready to fulfil</Button>
                  <Button variant="quiet" loading={working} disabled={working} onClick={() => patch(order.id, { status: "packing", tracking: tracking[order.id] ?? order.tracking ?? "" })}>packing</Button>
                  <Button variant="quiet" loading={working} disabled={working} onClick={() => patch(order.id, { status: "posted", tracking: tracking[order.id] ?? order.tracking ?? "" })}>mark posted</Button>
                  <Button variant="quiet" loading={working} disabled={working} onClick={() => patch(order.id, { status: "needs_address" })}>needs address</Button>
                  <Button variant="danger" loading={working} disabled={working} onClick={() => startCancel(order.id)}>cancel</Button>
                </div>
                </>
              )}
            </div>
          );
        })
      )}
    </>
  );
}
