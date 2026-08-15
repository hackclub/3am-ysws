"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { HackatimePicker } from "@/components/ui/HackatimePicker";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import type { PickerProject } from "@/lib/hackatime/projects";

import styles from "./ResendForm.module.css";

export type ResendDefaults = {
  id: string;
  title: string;
  description: string;
  repoUrl: string;
  demoUrl: string;
  thumbnailUrl: string;
  hackatimeProjects: string[];
};

export function ResendForm({
  project,
  options,
}: {
  project: ResendDefaults;
  options: PickerProject[];
}) {
  const router = useRouter();
  const ids = useId();

  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [repoUrl, setRepoUrl] = useState(project.repoUrl);
  const [demoUrl, setDemoUrl] = useState(project.demoUrl);
  const [thumbnailUrl, setThumbnailUrl] = useState(project.thumbnailUrl);
  const [picked, setPicked] = useState<string[]>(project.hackatimeProjects);
  const [updateMessage, setUpdateMessage] = useState("");
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);
  const [sending, setSending] = useState(false);

  const errorFor = (field: string) => (problem?.field === field ? problem.message : undefined);

  async function resend() {
    setSending(true);
    setProblem(null);

    const response = await fetch(`/api/projects/${project.id}/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        repoUrl,
        demoUrl,
        thumbnailUrl,
        hackatimeProjects: picked,
        updateMessage,
      }),
    });

    if (response.ok) {
      router.refresh();
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { field?: string; message?: string };
    setProblem({ field: body.field, message: body.message ?? "That did not send. Try again." });
    setSending(false);
  }

  return (
    <Panel>
      <PanelLabel>fix it and send it back</PanelLabel>
      <div className={styles.form}>
        {problem && !problem.field ? <Banner tone="bad">{problem.message}</Banner> : null}

        <Field
          id={`${ids}-what`}
          label="what changed?"
          help="Goes straight to the reviewer who asked."
          error={errorFor("update_message")}
        >
          <Textarea
            value={updateMessage}
            onChange={(event) => setUpdateMessage(event.target.value)}
          />
        </Field>

        <div className={styles.row}>
          <Field id={`${ids}-title`} label="name" error={errorFor("title")}>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field id={`${ids}-repo`} label="repository" error={errorFor("repo_url")}>
            <Input value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} />
          </Field>
        </div>

        <Field id={`${ids}-description`} label="what is it?" error={errorFor("description")}>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>

        <div className={styles.row}>
          <Field id={`${ids}-demo`} label="demo link" error={errorFor("demo_url")}>
            <Input value={demoUrl} onChange={(event) => setDemoUrl(event.target.value)} />
          </Field>
          <Field id={`${ids}-thumb`} label="screenshot link" error={errorFor("thumbnail_url")}>
            <Input value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} />
          </Field>
        </div>

        <Field
          id={`${ids}-projects`}
          label="hackatime projects"
          error={errorFor("hackatime_projects")}
        >
          <HackatimePicker options={options} value={picked} onChange={setPicked} />
        </Field>

        <div className={styles.actions}>
          <Button onClick={resend} loading={sending} loadingLabel="sending…">
            send it back
          </Button>
        </div>
      </div>
    </Panel>
  );
}
