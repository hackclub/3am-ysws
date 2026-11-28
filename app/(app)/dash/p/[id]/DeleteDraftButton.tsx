"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function DeleteDraftButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function remove() {
    setWorking(true);
    setProblem(null);

    const response = await fetch(`/api/projects/${id}/delete`, { method: "POST" });

    if (response.ok) {
      setOpen(false);
      router.push("/dash/projects");
      router.refresh();
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { message?: string };
    setProblem(body.message ?? "That did not work. Try again in a moment.");
    setWorking(false);
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        delete draft
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="delete this draft?"
        actions={
          <>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              keep it
            </Button>
            <Button variant="danger" onClick={remove} loading={working} loadingLabel="deleting…">
              delete
            </Button>
          </>
        }
      >
        {problem ? <Banner tone="bad">{problem}</Banner> : null}
        <p style={{ fontSize: "15px", color: "var(--soft)" }}>
          It was never sent in, so nobody has seen it. This can&apos;t be undone.
        </p>
      </Modal>
    </>
  );
}
