"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Is this free?",
    a: "Yep, totally free, same as every other Hack Club event.",
  },
  {
    q: "What can I ship?",
    a: "Anything you can access from a browser that you built during the event, like a website, a game, a tool, whatever you've got.",
  },
  {
    q: "Am I eligible?",
    a: "If you're 13 to 18, you're in, no matter where you live.",
  },
  {
    q: "Do I have to code at exactly 3 AM?",
    a: 'Nah, "3 AM" is more of a vibe than a schedule. Code whenever works for you during the event.',
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="full-bleed" id="faq" style={{ background: "var(--bg)" }}>
      <div className="inner faq-container">
        <div className="s-tag">
          <svg className="icon">
            <use href="#i-chat" />
          </svg>{" "}
          Questions
        </div>
        <h2 className="s-title">Frequently asked</h2>
        <p className="s-desc">Stuff people usually ask before jumping in.</p>

        <div className="faq-list">
          {faqs.map((item, i) => (
            <div className={`faq-item${openIndex === i ? " open" : ""}`} key={item.q}>
              <button
                className="faq-q"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                {item.q}
                <div className="faq-chevron">▾</div>
              </button>
              <div className="faq-a">
                <div className="faq-a-inner">{item.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
