"use client";

import { useEffect, useState } from "react";

interface YswsEntry {
  id: string;
  ysws: string | null;
  description: string | null;
  demo_url: string | null;
  code_url: string | null;
  github_username: string | null;
  hours: number | null;
  screenshot_url: string | null;
}

export default function ProjectMarquee() {
  const [entries, setEntries] = useState<YswsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch("/api/ysws");
        if (res.ok) {
          const allEntries: YswsEntry[] = await res.json();
          let filtered = allEntries.filter(
            (e) => e.ysws && e.ysws.toLowerCase().includes("3am")
          );

          if (filtered.length === 0) {
            filtered = allEntries.slice(0, 12);
          }
          setEntries(filtered);
        }
      } catch (err) {
        console.error("Failed to load projects for marquee:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  const displayEntries = entries.length > 0 ? [...entries, ...entries] : [];

  return (
    <section style={{
      padding: "5rem 0",
      backgroundColor: "#05070e",
      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      position: "relative",
      zIndex: 10,
      overflow: "hidden"
    }}>
      <style>{`
        @keyframes scrollMarquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .marquee-track:hover {
          animation-play-state: paused !important;
        }
      `}</style>

      <div style={{ maxWidth: "1280px", margin: "0 auto", textAlign: "center", marginBottom: "3rem", padding: "0 1.5rem" }}>
        <h2 style={{
          fontSize: "2.25rem",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "#ffffff",
          margin: "0 0 0.5rem 0",
          fontFamily: "'Space Grotesk', -apple-system, sans-serif"
        }}>
          Here are some 3AM projects so far:
        </h2>
        <p style={{ color: "#8d99ae", fontSize: "0.95rem", margin: 0 }}>
          Hover over any card to pause scrolling and test live demos
        </p>
      </div>

      {loading ? (
        <p style={{ color: "#8d99ae", textAlign: "center" }}>Loading approved project gallery...</p>
      ) : (
        <div style={{ width: "100%", overflow: "hidden" }}>
          <div
            className="marquee-track"
            style={{
              display: "flex",
              gap: "1.75rem",
              width: "max-content",
              animation: "scrollMarquee 35s linear infinite"
            }}
          >
            {displayEntries.map((proj, idx) => {
              const title = proj.description 
                ? (proj.description.length > 32 ? proj.description.slice(0, 32) + "..." : proj.description)
                : (proj.github_username ? `${proj.github_username}'s Build` : "3AM Project");

              const author = proj.github_username || "Community Builder";
              const imageUrl = proj.screenshot_url || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80";

              return (
                <div
                  key={`${proj.id}-${idx}`}
                  style={{
                    minWidth: "280px",
                    maxWidth: "280px",
                    backgroundColor: "rgba(15, 23, 42, 0.65)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "18px",
                    overflow: "hidden",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
                    display: "flex",
                    flexDirection: "column",
                    flexShrink: 0
                  }}
                >
                  <div style={{
                    width: "100%",
                    height: "170px",
                    backgroundColor: "#0d1322",
                    overflow: "hidden",
                    position: "relative"
                  }}>
                    <img
                      src={imageUrl}
                      alt={title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                      }}
                    />
                    {proj.hours && (
                      <span style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        backgroundColor: "rgba(11, 18, 30, 0.85)",
                        border: "1px solid rgba(255, 180, 84, 0.4)",
                        color: "#ffb454",
                        padding: "0.25rem 0.65rem",
                        borderRadius: "980px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backdropFilter: "blur(6px)"
                      }}>
                        ⚡ {proj.hours} hrs
                      </span>
                    )}
                  </div>

                  <div style={{
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    flexGrow: 1,
                    gap: "1rem"
                  }}>
                    <div>
                      <h3 style={{
                        margin: "0 0 0.3rem 0",
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        color: "#ffffff",
                        lineHeight: "1.3",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}>
                        {title}
                      </h3>
                      <p style={{
                        margin: 0,
                        fontSize: "0.85rem",
                        color: "#8d99ae",
                        fontWeight: 500
                      }}>
                        by <span style={{ color: "#d1d5db" }}>{author}</span>
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {proj.demo_url && (
                        <a
                          href={proj.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1,
                            textDecoration: "none",
                            textAlign: "center",
                            padding: "0.45rem 0.75rem",
                            borderRadius: "8px",
                            backgroundColor: "#0071e3",
                            color: "#ffffff",
                            fontSize: "0.8rem",
                            fontWeight: 600
                          }}
                        >
                          🌐 Demo
                        </a>
                      )}
                      {proj.code_url && (
                        <a
                          href={proj.code_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1,
                            textDecoration: "none",
                            textAlign: "center",
                            padding: "0.45rem 0.75rem",
                            borderRadius: "8px",
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            color: "#ffffff",
                            fontSize: "0.8rem",
                            fontWeight: 600
                          }}
                        >
                          💻 Code
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
