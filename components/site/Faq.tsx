import type { ReactNode } from "react";

import { AccordionItem } from "@/components/ui/Accordion";

import styles from "./Faq.module.css";

type Entry = { question: string; answer: ReactNode };

const FAQ: Entry[] = [
  {
    question: "is this free?",
    answer: "Yep, totally free, same as every other Hack Club event.",
  },
  {
    question: "what can I ship?",
    answer:
      "Make something dark themed like Website, tool, a game or anything that suits your interest, and get some amazing prizes from the #3AM Shop this Spooktober!!",
  },
  {
    question: "am I eligible?",
    answer: "If you're 13 to 18, you're in, no matter where you live.",
  },
  {
    question: "do I have to code at exactly 3am?",
    answer: "Nah, 3am is a vibe rather than a schedule. Code whenever works for you.",
  },
  {
    question: "do I need Hackatime?",
    answer:
      "Yes. It is how we know how long you spent, and it is what your rewards are worked out from.",
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
