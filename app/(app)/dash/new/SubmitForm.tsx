"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { HackatimePicker } from "@/components/ui/HackatimePicker";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { ThumbnailField } from "@/components/ui/ThumbnailField";
import { Panel, PanelLabel } from "@/components/ui/Panel";
import type { PickerProject } from "@/lib/hackatime/projects";

import styles from "./SubmitForm.module.css";

type Problem = { field?: string; message: string };

export function SubmitForm({ projects }: { projects: PickerProject[] }) {
  const router = useRouter();
  const ids = useId();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [sending, setSending] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const draftId = useRef<string | null>(null);
  const saving = useRef(false);

  const saveDraft = useCallback(async () => {
    if (!title.trim() || saving.current) return;
    saving.current = true;
    try {
      const response = await fetch("/api/projects/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draftId.current,
          title,
          description,
          repoUrl,
          demoUrl,
          thumbnailUrl,
          hackatimeProjects: picked,
        }),
      });
      if (!response.ok) return;
      const body = (await response.json()) as { id?: string };
      if (body.id) draftId.current = body.id;
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } finally {
      saving.current = false;
    }
  }, [title, description, repoUrl, demoUrl, thumbnailUrl, picked]);

  const errorFor = (field: string) => (problem?.field === field ? problem.message : undefined);

  async function send() {
    setSending(true);
    setProblem(null);

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: draftId.current,
        title,
        description,
        repoUrl,
        demoUrl,
        thumbnailUrl,
        hackatimeProjects: picked,
      }),
    });

    if (response.ok) {
      router.push("/dash");
      router.refresh();
      return;
    }

    const body = (await response.json().catch(() => ({}))) as {
      field?: string;
      message?: string;
      error?: string;
    };
    setProblem({
      field: body.field,
      message:
        body.message ??
        (body.error === "duplicate_repo"
          ? "You already have a project on that repository."
          : "That did not send. Try again in a moment."),
    });
    setSending(false);
  }

  return (
    <Panel>
      <PanelLabel>your project</PanelLabel>
      <div className={styles.form} onBlur={saveDraft}>
        {problem && !problem.field ? <Banner tone="bad">{problem.message}</Banner> : null}

        <div className={styles.row}>
          <Field id={`${ids}-title`} label="what is it called?" error={errorFor("title")}>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field
            id={`${ids}-repo`}
            label="repository"
            help="Has to be public. We read your commits from it."
            error={errorFor("repo_url")}
          >
            <Input
              value={repoUrl}
              placeholder="https://github.com/you/project"
              onChange={(event) => setRepoUrl(event.target.value)}
            />
          </Field>
        </div>

        <Field
          id={`${ids}-description`}
          label="what is it?"
          help="One or two sentences. First thing a reviewer reads."
          error={errorFor("description")}
        >
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>

        <Field
          id={`${ids}-projects`}
          label="hackatime projects"
          help="Pick the ones you worked on for this."
          error={errorFor("hackatime_projects")}
        >
          <HackatimePicker options={projects} value={picked} onChange={setPicked} />
        </Field>

        <div className={styles.row}>
          <Field
            id={`${ids}-demo`}
            label="demo link"
            help="A live link, or a build people can download and run."
            error={errorFor("demo_url")}
          >
            <Input value={demoUrl} onChange={(event) => setDemoUrl(event.target.value)} />
          </Field>
          <Field
            id={`${ids}-thumb`}
            label="screenshot"
            help="Shown to reviewers and on your dashboard."
            error={errorFor("thumbnail_url")}
          >
            <ThumbnailField value={thumbnailUrl} onChange={setThumbnailUrl} />
          </Field>
        </div>

        <div className={styles.actions}>
          <Button onClick={send} loading={sending} loadingLabel="sending…">
            send it in
          </Button>
          {savedAt ? <span className={styles.saved}>draft saved at {savedAt}</span> : null}
        </div>
      </div>
    </Panel>
  );
}
