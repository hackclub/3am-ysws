import type { ReactNode } from "react";

import { AccordionItem } from "@/components/ui/Accordion";

import styles from "./Faq.module.css";

type Entry = { question: string; answer: ReactNode };

const FAQ: Entry[] = [
  {
    question: "what is 3am?",
    answer:
      "3AM is a Hack Club YSWS (You Ship We Ship) event. Build a dark-themed hardware or software project, track your build time with Hackatime, and ship your work to earn beans you can spend on rewards in the #3AM Shop this Spooktober.",
  },
  {
    question: "who can participate?",
    answer: "Anyone aged 13–18 inclusive can join, regardless of experience or where they live. Beginners are welcome; make something you care about and learn as you go.",
  },
  {
    question: "what can I ship?",
    answer:
      "Make something dark themed like Website, tool, a game or anything that suits your interest, and get some amazing prizes from the #3AM Shop this Spooktober!!",
  },
  {
    question: "does it have to be hardware or software?",
    answer:
      "Either! Choose Hardware for a physical build or electronics project, or Software for a website, game, app, tool, or other digital project. Your project should fit the dark, spooky Spooktober theme.",
  },
  {
    question: "do I have to build at exactly 3am?",
    answer: "Nope! 3AM is a vibe, not a schedule. Build whenever works for you, and please take care of yourself.",
  },
  {
    question: "is double-dipping allowed?",
    answer:
      "No. You cannot claim the same work or hours for multiple programs. You may submit a project you entered in another program only if you have made significant changes to it; be transparent about what changed.",
  },
  {
    question: "is this really free?",
    answer: (
      <>
        Yup, it's free to participate. Hack Club is a 501(c)(3) nonprofit. Learn more at{" "}
        <a href="https://the.hackfoundation.org/" target="_blank" rel="noreferrer">
          the Hack Foundation
        </a>
        .
      </>
    ),
  },
  {
    question: "how do I record my hours?",
    answer: (
      <>
        We use{" "}
        <a href="https://hackatime.hackclub.com/" target="_blank" rel="noreferrer">
          Hackatime
        </a>{" "}
        to track time spent building. During signup, you created a Hackatime account. Follow the{" "}
        <a href="https://hackatime.hackclub.com/" target="_blank" rel="noreferrer">
          Hackatime setup guide
        </a>{" "}
        to install a WakaTime-compatible extension for your editor or IDE. Compatible tools can
        include Figma and KiCad too. Once set up, build normally, give your first tracked time a
        few minutes to appear, then check your Projects page. Make sure your time is attached to
        your actual project name, not “Unknown”.
      </>
    ),
  },
  {
    question: "which Hackatime link should I submit?",
    answer: (
      <>
        Open your{" "}
        <a href="https://hackatime.hackclub.com/" target="_blank" rel="noreferrer">
          Hackatime Projects
        </a>{" "}
        page and click the project you want to submit. Do not copy that page's URL directly: it
        may show reviewers zero hours. Instead, click the share button in the top-right, confirm
        with “Share Project”, then copy the generated share link and add that link to your
        submission.
      </>
    ),
  },
  {
    question: "how do I submit a project?",
    answer:
      "Connect Hackatime, open the submission form, choose Hardware or Software, add your project details and public repository, include a working demo or downloadable build and a still screenshot, then select the relevant Hackatime projects. Check everything before sending it in.",
  },
  {
    question: "what makes a good submission?",
    answer:
      "Submit work you actually built, with a public repository, a README explaining what it does and how to run it, a working demo or downloadable build, and a still screenshot. Low-quality or AI-generated work may be removed and can lead to a ban from 3AM.",
  },
];

export function Faq() {
  return (
    <div className={styles.list}>
      {FAQ.map((entry) => (
        <AccordionItem key={entry.question} question={entry.question}>
          {entry.answer}
        </AccordionItem>
      ))}
    </div>
  );
}
