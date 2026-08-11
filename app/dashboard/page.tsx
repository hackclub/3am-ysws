import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchUserData } from "@/lib/airtable";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  // 1. Require Auth: Redirect unauthenticated users to Login
  if (!sessionToken) {
    redirect("/api/auth/login");
  }

  // 2. Fetch authenticated user profile from Airtable
  const user = await fetchUserData(sessionToken);

  if (!user) {
    // If session token is invalid or expired
    redirect("/api/auth/login");
  }

  const approvedHours = user.approvedHours || 0;
  const coffeeBeans = user.coffeeBeans || 0;
  const displayName = "3AM Hacker";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#05070e",
        color: "#f5ede0",
        padding: "3rem 1.5rem",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        
        {/* Header Bar */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "2rem",
            marginBottom: "3rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#ffffff",
                margin: "0 0 0.35rem 0",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              3AM Dashboard
            </h1>
            <p style={{ margin: 0, color: "#8d99ae", fontSize: "0.95rem" }}>
              Welcome back, <span style={{ color: "#ffffff", fontWeight: 600 }}>{displayName}</span>
            </p>
          </div>

          {/* Metric Pills */}
          <div style={{ display: "flex", gap: "0.85rem", alignItems: "center" }}>
            {/* Approved Hours */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(255, 180, 84, 0.3)",
                padding: "0.55rem 1.15rem",
                borderRadius: "980px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
                backdropFilter: "blur(12px)",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffb454"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#8d99ae",
                  letterSpacing: "0.06em",
                }}
              >
                APPROVED
              </span>
              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#ffb454" }}>
                {approvedHours} hrs
              </span>
            </div>

            {/* Coffee Beans */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(255, 77, 109, 0.3)",
                padding: "0.55rem 1.15rem",
                borderRadius: "980px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
                backdropFilter: "blur(12px)",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ff4d6d"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v10M9 9.5c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5-1.5 2.5-3 2.5-3 1-3 2.5 1.5 2.5 3 2.5" />
              </svg>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#8d99ae",
                  letterSpacing: "0.06em",
                }}
              >
                BEANS
              </span>
              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#ff4d6d" }}>
                {coffeeBeans}
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard Grid Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "2rem",
          }}
        >
          {/* Card 1: Shop */}
          <div
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              padding: "2.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              backdropFilter: "blur(16px)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  backgroundColor: "rgba(0, 113, 227, 0.12)",
                  border: "1px solid rgba(0, 113, 227, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1.5rem",
                  overflow: "hidden",
                }}
              >
                <img
                  src="https://freesvg.org/img/Anonymous_Architetto_--_Cesto.png"
                  alt="Cart"
                  style={{ width: "34px", height: "34px", objectFit: "contain" }}
                />
              </div>

              <h2 style={{ fontSize: "1.45rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.65rem 0" }}>
                The 3AM SHOP
              </h2>
              <p style={{ color: "#8d99ae", fontSize: "0.95rem", lineHeight: "1.6", margin: "0 0 2rem 0" }}>
                Redeem your approved hours and coffee beans for hardware grants, gadgets, and coding gear.
              </p>
            </div>

            <Link
              href="/shop"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#2997ff",
                fontWeight: 600,
                fontSize: "0.95rem",
                textDecoration: "none",
              }}
            >
              Open Store & Order Rewards
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          {/* Card 2: Explore Community */}
          <div
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              padding: "2.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              backdropFilter: "blur(16px)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  backgroundColor: "rgba(48, 209, 88, 0.12)",
                  border: "1px solid rgba(48, 209, 88, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1.5rem",
                  overflow: "hidden",
                }}
              >
                <img
                  src="https://freesvg.org/img/Architetto----Bussola.png"
                  alt="Compass"
                  style={{ width: "34px", height: "34px", objectFit: "contain" }}
                />
              </div>

              <h2 style={{ fontSize: "1.45rem", fontWeight: 700, color: "#ffffff", margin: "0 0 0.65rem 0" }}>
                Explore Community
              </h2>
              <p style={{ color: "#8d99ae", fontSize: "0.95rem", lineHeight: "1.6", margin: "0 0 2rem 0" }}>
                Discover approved projects built by other 3 AM hackers, test live demos, and inspect code repos.
              </p>
            </div>

            <Link
              href="/explore"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#2997ff",
                fontWeight: 600,
                fontSize: "0.95rem",
                textDecoration: "none",
              }}
            >
              Explore Showcase
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
