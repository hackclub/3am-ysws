"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function WithdrawButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function withdraw() {
    setWorking(true);
    setProblem(null);

    const response = await fetch(`/api/projects/${id}/withdraw`, { method: "POST" });

    if (response.ok) {
      setOpen(false);
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
        withdraw
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="withdraw this project?"
        actions={
          <>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              keep it
            </Button>
            <Button variant="danger" onClick={withdraw} loading={working} loadingLabel="pulling…">
              withdraw
            </Button>
          </>
        }
      >
        {problem ? <Banner tone="bad">{problem}</Banner> : null}
        <p style={{ fontSize: "15px", color: "var(--soft)" }}>
          It comes off the queue and nobody looks at it. You can send it again later.
        </p>
      </Modal>
    </>
  );
}
