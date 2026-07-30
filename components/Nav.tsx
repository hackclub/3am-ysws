"use client";

import { useState } from "react";

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav style={{ display: "none" }}>
      <a href="#" className="nav-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hackclub-logo.jpg" alt="Hack Club Logo" />
        <span className="nav-brand-text">
          YSWS <span>3AM</span>
        </span>
      </a>
      <button
        className="hamburger"
        id="hamburger"
        aria-label="Toggle navigation"
        onClick={() => setOpen((v) => !v)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <ul className={`nav-links${open ? " open" : ""}`} id="navLinks">
        <li>
          <a href="#timer" onClick={() => setOpen(false)}>
            Timer
          </a>
        </li>
        <li>
          <a href="#rewards" onClick={() => setOpen(false)}>
            Rewards
          </a>
        </li>
        <li>
          <a href="#faq" onClick={() => setOpen(false)}>
            FAQ
          </a>
        </li>
        <li>
          <a
            href="https://forms.hackclub.com/3am"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-cta"
            onClick={() => setOpen(false)}
          >
            Submit Project
          </a>
        </li>
      </ul>
    </nav>
  );
}
