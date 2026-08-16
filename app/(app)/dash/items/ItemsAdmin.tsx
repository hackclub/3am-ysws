"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import { ThumbnailField } from "@/components/ui/ThumbnailField";
import type { Item } from "@/lib/db/schema";

import styles from "./ItemsAdmin.module.css";

type Draft = {
  name: string;
  description: string;
  cost: string;
  stock: string;
  imageUrl: string;
};

const BLANK: Draft = { name: "", description: "", cost: "", stock: "", imageUrl: "" };

function toPayload(draft: Draft) {
  return {
    name: draft.name,
    description: draft.description,
    cost: Number(draft.cost),
    stock: draft.stock.trim() === "" ? null : Number(draft.stock),
    imageUrl: draft.imageUrl,
  };
}

export function ItemsAdmin({ items }: { items: Item[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [editing, setEditing] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(url: string, method: string, payload: unknown) {
    setBusy(true);
    setProblem(null);

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setBusy(false);

    if (response.ok) {
      router.refresh();
      return true;
    }

    const body = (await response.json().catch(() => ({}))) as { message?: string };
    setProblem(body.message ?? "That did not save.");
    return false;
  }

  async function create() {
    if (await send("/api/admin/items", "POST", toPayload(draft))) setDraft(BLANK);
  }

  async function save(id: string) {
    if (await send(`/api/admin/items/${id}`, "PATCH", toPayload(draft))) {
      setEditing(null);
      setDraft(BLANK);
    }
  }

  function startEdit(item: Item) {
    setEditing(item.id);
    setProblem(null);
    setDraft({
      name: item.name,
      description: item.description ?? "",
      cost: String(item.cost),
      stock: item.stock === null ? "" : String(item.stock),
      imageUrl: item.imageUrl ?? "",
    });
  }

  const form = (
    <div className={styles.wrap}>
      {problem ? <Banner tone="bad">{problem}</Banner> : null}
      <div className={styles.grid}>
        <label className={styles.half}>
          <span className={styles.label}>name</span>
          <input
            className={styles.input}
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </label>
        <label className={styles.half}>
          <span className={styles.label}>cost in beans</span>
          <input
            className={styles.input}
            inputMode="numeric"
            value={draft.cost}
            onChange={(event) => setDraft({ ...draft, cost: event.target.value })}
          />
        </label>
        <label className={styles.half}>
          <span className={styles.label}>stock</span>
          <input
            className={styles.input}
            inputMode="numeric"
            placeholder="unlimited"
            value={draft.stock}
            onChange={(event) => setDraft({ ...draft, stock: event.target.value })}
          />
          <span className={styles.help}>Leave empty for unlimited.</span>
        </label>
      </div>

      <label className={styles.half} style={{ minWidth: "100%" }}>
        <span className={styles.label}>description</span>
        <input
          className={styles.input}
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </label>

      <div>
        <span className={styles.label}>image</span>
        <ThumbnailField
          value={draft.imageUrl}
          onChange={(next) => setDraft({ ...draft, imageUrl: next })}
        />
      </div>

      <div className={styles.actions}>
        {editing ? (
          <>
            <Button onClick={() => save(editing)} loading={busy} loadingLabel="saving…">
              save changes
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setEditing(null);
                setDraft(BLANK);
                setProblem(null);
              }}
            >
              cancel
            </Button>
          </>
        ) : (
          <Button onClick={create} loading={busy} loadingLabel="adding…">
            add item
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Panel>
        <PanelLabel>{editing ? "edit item" : "add an item"}</PanelLabel>
        {form}
      </Panel>

      <Panel>
        <PanelLabel>{items.length === 1 ? "1 item" : `${items.length} items`}</PanelLabel>
        {items.length === 0 ? (
          <p className={styles.none}>Nothing in the shop yet.</p>
        ) : (
          <div className={styles.wrap}>
            {items.map((item) => (
              <div
                key={item.id}
                className={[styles.row, item.hidden ? styles.dim : null].filter(Boolean).join(" ")}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className={styles.thumb} />
                ) : (
                  <span className={styles.blank} aria-hidden="true">
                    🌙
                  </span>
                )}
                <span className={styles.name}>
                  {item.name}
                  <span className={styles.meta}>
                    {item.cost} beans · {item.stock === null ? "unlimited" : `${item.stock} left`}
                    {item.hidden ? " · hidden" : ""}
                  </span>
                </span>
                <span className={styles.actions}>
                  <Button variant="quiet" onClick={() => startEdit(item)}>
                    edit
                  </Button>
                  <Button
                    variant="quiet"
                    onClick={() =>
                      send(`/api/admin/items/${item.id}`, "PATCH", { hidden: !item.hidden })
                    }
                  >
                    {item.hidden ? "show" : "hide"}
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
