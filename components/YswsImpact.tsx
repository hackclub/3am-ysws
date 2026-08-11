import { getYswsStats } from "@/lib/stats";

export default async function YswsImpact() {
  // 100% Dynamic API Call to Airtable
  const { totalProjects, totalHours } = await getYswsStats();

  const stats = [
    { value: totalProjects, label: "Projects Built", accent: "#ffb454" },
    { value: totalHours, label: "Hours Shipped", accent: "#ff4d6d" },
  ];

  return (
    <section style={{
      padding: "5rem 1.5rem",
      backgroundColor: "#070912",
      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      position: "relative",
      zIndex: 10
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <h2 style={{
          fontSize: "2rem",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "#ffffff",
          marginBottom: "0.5rem",
          fontFamily: "'Space Grotesk', -apple-system, sans-serif"
        }}>
          YSWS Impact
        </h2>
        <p style={{
          color: "#8d99ae",
          fontSize: "0.95rem",
          marginBottom: "3rem"
        }}>
          Live impact metrics tracked across all 3 AM submissions
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "2rem",
          justifyContent: "center"
        }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{
              background: "linear-gradient(180deg, rgba(21, 34, 56, 0.6) 0%, rgba(11, 18, 30, 0.8) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "20px",
              padding: "2.75rem 2rem",
              backdropFilter: "blur(16px)",
              boxShadow: "0 15px 35px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Subtle Ambient Glow */}
              <div style={{
                position: "absolute",
                top: "-40px",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: stat.accent,
                opacity: 0.12,
                filter: "blur(40px)",
                pointerEvents: "none"
              }} />

              <span style={{
                fontFamily: "'Space Grotesk', monospace",
                fontWeight: 800,
                fontSize: "3.5rem",
                color: "#ffffff",
                lineHeight: "1",
                letterSpacing: "-0.03em",
                textShadow: `0 0 25px ${stat.accent}55`
              }}>
                {stat.value.toLocaleString()}
              </span>

              <span style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#8d99ae",
                marginTop: "1rem"
              }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
