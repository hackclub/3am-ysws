import { getYswsStats } from "@/lib/stats";

export default async function YswsImpact() {
  const { totalProjects, totalHours } = await getYswsStats();

  const stats = [
    { value: totalProjects, label: "Projects Built" },
    { value: totalHours, label: "Hours Shipped" },
  ];

  return (
    <section
      style={{
        padding: "4rem 1rem",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: "2rem",
          color: "#fff",
          marginBottom: "2.5rem",
        }}
      >
        YSWS Impact
      </h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "1.5rem",
          maxWidth: "40rem",
          margin: "0 auto",
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: "1 1 180px",
              minWidth: "180px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
              padding: "2.5rem 2rem",
            }}
          >
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "3rem",
                color: "#f5ede0",
                margin: 0,
              }}
            >
              {stat.value.toLocaleString()}
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#9ca3af",
                marginTop: "0.75rem",
              }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
