"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function ExplorePage() {
  const [entries, setEntries] = useState<YswsEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/ysws");
        if (res.ok) {
          const allEntries: YswsEntry[] = await res.json();
          let filtered = allEntries.filter(
            (e) => e.ysws && e.ysws.toLowerCase().includes("3am")
          );
          if (filtered.length === 0) {
            filtered = allEntries;
          }
          setEntries(filtered);
        }
      } catch (err) {
        console.error("Failed to fetch explore projects:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const filteredEntries = entries.filter((item) => {
    const title = (item.description || item.github_username || "").toLowerCase();
    return title.includes(search.toLowerCase());
  });

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#05070e",
      color: "#f5ede0",
      padding: "3rem 1.5rem",
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        
        {/* Navigation & Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <Link
            href="/dashboard"
            style={{
              color: "#8d99ae",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              marginBottom: "1rem"
            }}
          >
            ← Back to Dashboard
          </Link>
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#ffffff",
            margin: "0 0 0.5rem 0",
            fontFamily: "'Space Grotesk', sans-serif"
          }}>
            Explore 3AM Showcase
          </h1>
          <p style={{ color: "#8d99ae", margin: 0, fontSize: "0.95rem" }}>
            Discover dark-themed builds shipped by hackers around the world.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: "2.5rem" }}>
          <input
            type="text"
            placeholder="Search projects by keywords or creator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "0.85rem 1.25rem",
              backgroundColor: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "12px",
              color: "#ffffff",
              fontSize: "0.95rem",
              outline: "none"
            }}
          />
        </div>

        {/* Projects Grid */}
        {loading ? (
          <p style={{ color: "#8d99ae" }}>Loading showcase projects...</p>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.75rem"
          }}>
            {filteredEntries.map((proj) => {
              const title = proj.description 
                ? (proj.description.length > 35 ? proj.description.slice(0, 35) + "..." : proj.description)
                : (proj.github_username ? `${proj.github_username}'s Build` : "3AM Project");

              const author = proj.github_username || "Community Builder";
              const imageUrl = proj.screenshot_url || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80";

              return (
                <div
                  key={proj.id}
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.65)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "18px",
                    overflow: "hidden",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  <div style={{
                    width: "100%",
                    height: "170px",
                    backgroundColor: "#0d1322",
                    position: "relative"
                  }}>
                    <img
                      src={imageUrl}
                      alt={title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
                        fontWeight: 700
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
                      <h3 style={{ margin: "0 0 0.3rem 0", fontSize: "1.05rem", fontWeight: 700, color: "#ffffff" }}>
                        {title}
                      </h3>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#8d99ae" }}>
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
        )}

      </div>
    </div>
  );
}
