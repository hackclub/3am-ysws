import Link from "next/link";
import StarCanvas from "./StarCanvas";
import MoonPhase from "./MoonPhase";
import FogLayer from "./FogLayer";
import TypewriterSubtitle from "./TypewriterSubtitle";
import CountdownTimer from "./CountdownTimer";

export default function Hero() {
  return (
    <section className="hero" style={{ position: "relative" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero-flag" src="/hackclub-flag.svg" alt="Hack Club Flag" />

      <div className="hero-sky"></div>
      <StarCanvas />

      <MoonPhase />

      <FogLayer />

      <div className="hero-content" style={{ paddingTop: "2.5rem" }}>
        {/* Clean Countdown Badge */}
        <CountdownTimer />

        <div className="eyebrow" style={{ marginTop: "0.25rem", marginBottom: "0.75rem" }}>
          <svg className="icon">
            <use href="#i-spark" />
          </svg>{" "}
          YSWS by Hridhaan with help by Seba
        </div>

        <h1 className="hero-title">
          YSWS <span>3AM</span>
        </h1>

        <TypewriterSubtitle />

        <p className="hero-desc">
          Pick something dark themed to build, a site, a tool, a game, whatever you&apos;re into,
          and get <span>real rewards</span> for actually finishing it.
        </p>

        <div className="btns">
          <a
            className="btn btn-primary"
            href="https://forms.hackclub.com/3am"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="icon">
              <use href="#i-arrow" />
            </svg>{" "}
            Submit your project
          </a>

          <Link href="/dashboard" className="btn btn-ghost">
            <svg className="icon">
              <use href="#i-book" />
            </svg>{" "}
            Go to Dashboard
          </Link>
        </div>
      </div>

      {/* DETAILED ATMOSPHERIC LANDSCAPE */}
      <div className="land-wrap">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bgHillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#111827" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0b0e1a" />
            </linearGradient>

            <linearGradient id="mainHillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b0e1a" />
              <stop offset="100%" stopColor="#05070e" />
            </linearGradient>

            <filter id="windowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* BACKGROUND HILL LAYER */}
          <path
            d="M0 200 Q220 140 450 180 T900 150 Q1200 130 1440 170 L1440 320 L0 320Z"
            fill="url(#bgHillGrad)"
          />

          {/* BACKGROUND TREES */}
          <g fill="#0c1220" opacity="0.6">
            <polygon points="180,185 173,205 187,205" />
            <polygon points="180,178 175,193 185,193" />
            <polygon points="210,180 202,202 218,202" />
            <polygon points="210,172 205,188 215,188" />

            <polygon points="1120,165 1112,188 1128,188" />
            <polygon points="1120,158 1114,174 1126,174" />
            <polygon points="1150,160 1141,185 1159,185" />
            <polygon points="1150,152 1144,170 1156,170" />
          </g>

          {/* FOREGROUND MAIN HILL LAYER */}
          <path
            d="M0 230 Q200 180 420 220 Q620 260 720 195 Q880 145 1100 210 Q1280 250 1440 210 L1440 320 L0 320Z"
            fill="url(#mainHillGrad)"
          />

          {/* FOREGROUND DETAILED PINE TREES */}
          <g fill="#05070e">
            <polygon points="80,240 68,270 92,270" />
            <polygon points="80,225 71,250 89,250" />
            <polygon points="80,210 74,232 86,232" />

            <polygon points="130,235 120,262 140,262" />
            <polygon points="130,220 122,242 138,242" />
            <polygon points="130,208 125,226 135,226" />

            <polygon points="1280,240 1268,270 1292,270" />
            <polygon points="1280,225 1271,250 1289,250" />
            <polygon points="1280,210 1274,232 1286,232" />

            <polygon points="1330,245 1320,272 1340,272" />
            <polygon points="1330,230 1322,252 1338,252" />
            <polygon points="1330,218 1325,236 1335,236" />
          </g>

          {/* COZY CABIN */}
          <g>
            <polygon points="680,220 680,185 715,155 750,185 750,220" fill="#04050a" />
            <polygon points="675,187 715,152 755,187 751,192 715,159 679,192" fill="#0c1220" />
            <rect x="732" y="160" width="8" height="22" fill="#04050a" />

            {/* Warm Glowing Windows */}
            <rect x="693" y="190" width="16" height="16" rx="2" fill="#ffb454" filter="url(#windowGlow)" opacity="0.95" />
            <line x1="701" y1="190" x2="701" y2="206" stroke="#04050a" strokeWidth="1.5" />
            <line x1="693" y1="198" x2="709" y2="198" stroke="#04050a" strokeWidth="1.5" />

            {/* Door */}
            <rect x="724" y="195" width="12" height="25" rx="1" fill="#0a0e1a" />
            <circle cx="727" cy="208" r="1" fill="#ffb454" />
          </g>

          {/* GROUND COVER / BASE FILL */}
          <rect x="0" y="275" width="1440" height="45" fill="#05070e" />
        </svg>
      </div>

      <div className="scroll-hint">
        <span>Scroll down</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  );
}
