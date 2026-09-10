"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { OrderStatusWord } from "@/components/ui/StatusWord";
import type { Order, User } from "@/lib/db/schema";
import { orderStatusOf } from "@/lib/projects/status";

import styles from "./Queue.module.css";

export type QueueRow = { order: Order; maker: User };

export function Queue({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [canceling, setCanceling] = useState<string | null>(null);
  const [cancelNote, setCancelNote] = useState("");

  async function patch(id: string, payload: Record<string, unknown>) {
    setBusy(id);
    setProblem(null);
    const response = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(null);
    if (response.ok) {
      setCanceling(null);
      setCancelNote("");
      router.refresh();
      return;
    }
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    setProblem(body.message ?? "That did not save.");
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

  if (rows.length === 0) return <p className={styles.none}>Nothing here.</p>;

  return (
    <>
      {problem ? <Banner tone="bad">{problem}</Banner> : null}
      {rows.map(({ order, maker }) => {
        const hasAddress = Boolean(order.addressLine1 && order.city && order.country);
        const working = busy === order.id;
        const isCanceling = canceling === order.id;

        return (
          <div key={order.id} className={styles.order}>
            <div className={styles.head}>
              <span>
                <span className={styles.item}>{order.itemName}</span>
                <span className={styles.maker}>{" "}{maker.name} · {maker.slackId} · {order.cost} beans</span>
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
                    disabled={!cancelNote.trim()}
                    onClick={() => patch(order.id, { status: "cancelled", adminNote: cancelNote.trim(), refundBeans: false })}
                  >
                    cancel — no refund
                  </Button>
                  <Button
                    variant="danger"
                    loading={working}
                    disabled={!cancelNote.trim()}
                    onClick={() => patch(order.id, { status: "cancelled", adminNote: cancelNote.trim(), refundBeans: true })}
                  >
                    cancel & refund
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.actions}>
                <input
                  className={styles.tracking}
                  placeholder="tracking, optional"
                  value={tracking[order.id] ?? order.tracking ?? ""}
                  onChange={(event) => setTracking({ ...tracking, [order.id]: event.target.value })}
                />
                <Button variant="quiet" loading={working} onClick={() => patch(order.id, { status: "ready_to_fulfil", tracking: tracking[order.id] ?? order.tracking ?? "" })} className={styles.ready}>✓ ready to fulfil</Button>
                <Button variant="quiet" loading={working} onClick={() => patch(order.id, { status: "packing", tracking: tracking[order.id] ?? order.tracking ?? "" })}>packing</Button>
                <Button variant="quiet" loading={working} onClick={() => patch(order.id, { status: "posted", tracking: tracking[order.id] ?? order.tracking ?? "" })}>mark posted</Button>
                <Button variant="quiet" loading={working} onClick={() => patch(order.id, { status: "needs_address" })}>needs address</Button>
                <Button variant="danger" loading={working} onClick={() => startCancel(order.id)}>cancel</Button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
