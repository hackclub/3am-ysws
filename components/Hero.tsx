import StarCanvas from "./StarCanvas";
import MoonPhase from "./MoonPhase";
import FogLayer from "./FogLayer";
import TypewriterSubtitle from "./TypewriterSubtitle";
import ScrollToButton from "./ScrollToButton";

export default function Hero() {
  return (
    <section className="hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hero-flag" src="/hackclub-flag.svg" alt="Hack Club Flag" />
      <div className="hero-sky"></div>
      <StarCanvas />

      <MoonPhase />

      <FogLayer />

      <div className="hero-content">
        <div className="eyebrow">
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
          <ScrollToButton target="faq" className="btn btn-ghost">
            <svg className="icon">
              <use href="#i-book" />
            </svg>{" "}
            Read the rules
          </ScrollToButton>
        </div>
      </div>

      <div className="land-wrap">
        <svg viewBox="0 0 1440 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b0e1a" />
              <stop offset="100%" stopColor="#070912" />
            </linearGradient>
          </defs>
          <path
            d="M0 220 Q180 170 360 210 Q560 250 760 190 Q980 140 1180 205 Q1320 240 1440 200 L1440 300 L0 300Z"
            fill="url(#hillGrad)"
          />
          <g fill="#060811">
            <polygon points="120,220 120,175 133,175 133,150 146,150 146,175 159,175 159,220" />
            <polygon points="1250,215 1250,170 1263,170 1263,145 1276,145 1276,170 1289,170 1289,215" />
          </g>
          <g>
            <polygon points="660,230 660,190 700,160 740,190 740,230" fill="#080a14" />
            <rect x="705" y="205" width="14" height="14" fill="#ffb454" opacity="0.85" />
          </g>
          <rect x="0" y="260" width="1440" height="40" fill="#070912" />
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
