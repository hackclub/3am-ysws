"use client";

import Link from "next/link";

const REWARDS = [
  {
    title: "Pinecil Smart Soldering Iron",
    hours: "10 Hours",
    category: "Hardware",
    icon: "🔌",
    desc: "RISC-V portable soldering iron for building custom hardware & PCB hacks.",
  },
  {
    title: "Mechanical Keyboard Kit",
    hours: "15 Hours",
    category: "Peripherals",
    icon: "⌨️",
    desc: "Custom hotswap PCB, switches, and dark keycaps for midnight coding sessions.",
  },
  {
    title: "Raspberry Pi 5 (8GB)",
    hours: "20 Hours",
    category: "SBC",
    icon: "🍓",
    desc: "Next-gen miniature Linux computer to host home servers and IoT bots.",
  },
  {
    title: "$50 Hardware Grant",
    hours: "12 Hours",
    category: "Grant",
    icon: "💳",
    desc: "Reimbursement grant for custom sensors, microcontrollers, and electronic parts.",
  },
  {
    title: "Artisanal Dark Roast Beans",
    hours: "5 Hours",
    category: "Fuel",
    icon: "☕",
    desc: "Freshly roasted coffee beans delivered directly to your door.",
  },
  {
    title: "ANC Midnight Headphones",
    hours: "30 Hours",
    category: "Audio",
    icon: "🎧",
    desc: "Active noise-canceling headphones to keep you in the zone past 3 AM.",
  },
];

export default function RewardsSection() {
  // Duplicate list for seamless infinite marquee loop
  const displayRewards = [...REWARDS, ...REWARDS];

  return (
    <section
      id="rewards"
      style={{
        padding: "5rem 0",
        backgroundColor: "#070912",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        position: "relative",
        zIndex: 10,
        overflow: "hidden"
      }}
    >
      {/* Auto-Scroll CSS Marquee Animation */}
      <style>{`
        @keyframes scrollRewards {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .rewards-track:hover {
          animation-play-state: paused !important;
        }
      `}</style>

      <div style={{ maxWidth: "1280px", margin: "0 auto", textAlign: "center", marginBottom: "3rem", padding: "0 1.5rem" }}>
        <div style={{
          display: "inline-block",
          backgroundColor: "rgba(255, 180, 84, 0.12)",
          border: "1px solid rgba(255, 180, 84, 0.3)",
          color: "#ffb454",
          padding: "0.35rem 1rem",
          borderRadius: "980px",
          fontSize: "0.85rem",
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: "1rem"
        }}>
          🎁 What you can earn
        </div>

        <h2 style={{
          fontSize: "2.5rem",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "#ffffff",
          margin: "0 0 0.75rem 0",
          fontFamily: "'Space Grotesk', -apple-system, sans-serif"
        }}>
          The 3AM Shop Rewards
        </h2>
        <p style={{ color: "#8d99ae", fontSize: "1.05rem", maxWidth: "600px", margin: "0 auto" }}>
          Ship dark-themed projects, earn approved hours, and exchange them for real physical hardware. Hover to pause!
        </p>
      </div>

      {/* Auto-Moving Rewards Track */}
      <div style={{ width: "100%", overflow: "hidden", marginBottom: "3.5rem" }}>
        <div
          className="rewards-track"
          style={{
            display: "flex",
            gap: "1.75rem",
            width: "max-content",
            animation: "scrollRewards 40s linear infinite"
          }}
        >
          {displayRewards.map((item, idx) => (
            <div
              key={`${item.title}-${idx}`}
              style={{
                minWidth: "320px",
                maxWidth: "320px",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "20px",
                padding: "2rem",
                textAlign: "left",
                backdropFilter: "blur(12px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
                flexShrink: 0
              }}
            >
              <div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.25rem"
                }}>
                  <span style={{ fontSize: "2.5rem" }}>{item.icon}</span>
                  <span style={{
                    backgroundColor: "rgba(48, 209, 88, 0.15)",
                    border: "1px solid rgba(48, 209, 88, 0.3)",
                    color: "#30d158",
                    padding: "0.35rem 0.85rem",
                    borderRadius: "980px",
                    fontSize: "0.85rem",
                    fontWeight: 700
                  }}>
                    ⚡ {item.hours}
                  </span>
                </div>

                <h3 style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  margin: "0 0 0.5rem 0"
                }}>
                  {item.title}
                </h3>

                <p style={{
                  color: "#8d99ae",
                  fontSize: "0.9rem",
                  lineHeight: "1.5",
                  margin: 0
                }}>
                  {item.desc}
                </p>
              </div>

              <div style={{
                marginTop: "1.5rem",
                paddingTop: "1rem",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{ color: "#6c757d", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>
                  {item.category}
                </span>
                <span style={{ color: "#ffb454", fontSize: "0.85rem", fontWeight: 600 }}>
                  In Stock →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View Full Shop Button */}
      <div style={{ textAlign: "center" }}>
        <Link
          href="/shop"
          style={{
            display: "inline-block",
            backgroundColor: "#ec3750",
            color: "#ffffff",
            padding: "0.95rem 2.25rem",
            borderRadius: "8px",
            fontSize: "1.05rem",
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 6px 20px rgba(236, 55, 80, 0.35)"
          }}
        >
          Browse Full Catalog & Order Rewards →
        </Link>
      </div>
    </section>
  );
}
