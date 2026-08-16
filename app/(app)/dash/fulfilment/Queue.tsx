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
      router.refresh();
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { message?: string };
    setProblem(body.message ?? "That did not save.");
  }

  if (rows.length === 0) return <p className={styles.none}>Nothing here.</p>;

  return (
    <>
      {problem ? <Banner tone="bad">{problem}</Banner> : null}
      {rows.map(({ order, maker }) => {
        const hasAddress = Boolean(order.addressLine1 && order.city && order.country);
        const working = busy === order.id;

        return (
          <div key={order.id} className={styles.order}>
            <div className={styles.head}>
              <span>
                <span className={styles.item}>{order.itemName}</span>
                <span className={styles.maker}>
                  {" "}
                  {maker.name} · {maker.slackId} · {order.cost} beans
                </span>
              </span>
              <OrderStatusWord status={orderStatusOf(order.status)} size="s" />
            </div>

            {hasAddress ? (
              <span className={styles.address}>
                {[
                  order.fullName,
                  order.addressLine1,
                  order.addressLine2,
                  `${order.city} ${order.postcode ?? ""}`.trim(),
                  order.country,
                  order.email,
                ]
                  .filter(Boolean)
                  .join("\n")}
              </span>
            ) : (
              <span className={[styles.address, styles.missing].join(" ")}>
                no address on this order, chase the maker
              </span>
            )}

            <div className={styles.actions}>
              <input
                className={styles.tracking}
                placeholder="tracking, optional"
                value={tracking[order.id] ?? order.tracking ?? ""}
                onChange={(event) => setTracking({ ...tracking, [order.id]: event.target.value })}
              />
              <Button
                variant="quiet"
                loading={working}
                onClick={() =>
                  patch(order.id, {
                    status: "packing",
                    tracking: tracking[order.id] ?? order.tracking ?? "",
                  })
                }
              >
                packing
              </Button>
              <Button
                variant="quiet"
                loading={working}
                onClick={() =>
                  patch(order.id, {
                    status: "posted",
                    tracking: tracking[order.id] ?? order.tracking ?? "",
                  })
                }
              >
                mark posted
              </Button>
              <Button
                variant="quiet"
                loading={working}
                onClick={() => patch(order.id, { status: "needs_address" })}
              >
                needs address
              </Button>
              <Button
                variant="danger"
                loading={working}
                onClick={() => patch(order.id, { status: "cancelled" })}
              >
                cancel and refund
              </Button>
            </div>
          </div>
        );
      })}
    </>
  );
}
