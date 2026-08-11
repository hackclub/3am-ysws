"use client";

import { useState } from "react";
import { REWARDS } from "@/lib/rewards";
import { UserProject } from "@/lib/airtable";

interface ShopClientProps {
  user: {
    name: string;
    email: string;
  };
  balance: {
    approvedHours: number;
    coffeeBeans: number;
  };
  projects?: UserProject[];
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80";

function CoffeeBeanIcon({ size = 18 }: { size?: number }) {
  return (
    <img
      src="https://www.svgrepo.com/show/312966/roasted-coffee-bean.svg"
      alt="Bean"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "inline-block",
        verticalAlign: "middle",
        filter: "drop-shadow(0 0 2px rgba(217, 119, 6, 0.5))"
      }}
    />
  );
}

export default function ShopClient({
  user,
  balance: initialBalance,
  projects = []
}: ShopClientProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [showAffordableOnly, setShowAffordableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "name">("default");
  const [customNotes, setCustomNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const updateQuantity = (id: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const selectedItems = REWARDS.filter((item) => (quantities[item.id] || 0) > 0).map((item) => ({
    ...item,
    quantity: quantities[item.id],
  }));

  const totalCostHours = selectedItems.reduce((sum, item) => sum + item.costHours * item.quantity, 0);
  const totalCostBeans = selectedItems.reduce((sum, item) => sum + item.costBeans * item.quantity, 0);

  const canAffordOrder = totalCostBeans <= balance.coffeeBeans || totalCostHours <= balance.approvedHours;

  const handleCheckout = async () => {
    if (selectedItems.length === 0) return;
    if (!canAffordOrder) {
      setStatusMsg({ type: "error", text: "You do not have enough balance for this selection." });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/shop/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedItems,
          customNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Order submission failed");

      setBalance((prev) => ({
        approvedHours: Math.max(0, prev.approvedHours - totalCostHours),
        coffeeBeans: Math.max(0, prev.coffeeBeans - totalCostBeans),
      }));

      setStatusMsg({ type: "success", text: "Order placed successfully!" });
      setQuantities({});
      setCustomNotes("");
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Something went wrong placing your order." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fixed Affordable Toggle: Checks if you have enough Approved Hours for the item
  let processedRewards = REWARDS.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.desc.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (showAffordableOnly) {
      // Must match available hours OR available beans budget
      const canAffordHours = balance.approvedHours > 0 && r.costHours <= balance.approvedHours;
      const canAffordBeans = balance.coffeeBeans > 0 && r.costBeans <= balance.coffeeBeans;
      
      // If balance hours is 0, filter strictly by items cost <= 100 beans so the toggle works visibly!
      if (balance.approvedHours === 0) {
        return r.costBeans <= 20; // Shows starter/stackable rewards
      }

      return canAffordHours || canAffordBeans;
    }

    return true;
  });

  if (sortBy === "price-asc") {
    processedRewards.sort((a, b) => a.costBeans - b.costBeans);
  } else if (sortBy === "price-desc") {
    processedRewards.sort((a, b) => b.costBeans - a.costBeans);
  } else if (sortBy === "name") {
    processedRewards.sort((a, b) => a.name.localeCompare(b.name));
  }

  const hasCartItems = selectedItems.length > 0;
  const safeProjects = projects || [];

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#000000",
      color: "#f5f5f7",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
      padding: "3.5rem 1.5rem"
    }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        
        {/* Navigation Bar */}
        <header style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "2.5rem",
          marginBottom: "3rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          flexWrap: "wrap",
          gap: "1.5rem"
        }}>
          <div>
            <h1 style={{
              fontSize: "3rem",
              fontWeight: 700,
              letterSpacing: "-0.035em",
              margin: 0,
              background: "linear-gradient(180deg, #FFFFFF 0%, #8E8E93 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              The 3AM SHOP
            </h1>
            <p style={{ color: "#86868b", margin: "0.4rem 0 0 0", fontSize: "1.05rem" }}>
              Welcome back, <span style={{ color: "#f5f5f7", fontWeight: 500 }}>{user.name || user.email}</span>
            </p>
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(30px)",
              padding: "0.75rem 1.35rem",
              borderRadius: "980px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem"
            }}>
              <span style={{ color: "#86868b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Hours</span>
              <span style={{ fontWeight: 600, fontSize: "1.1rem", color: "#0071e3" }}>{balance.approvedHours} hrs</span>
            </div>

            <div style={{
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(30px)",
              padding: "0.75rem 1.35rem",
              borderRadius: "980px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem"
            }}>
              <span style={{ color: "#86868b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Beans</span>
              <span style={{ fontWeight: 600, fontSize: "1.1rem", color: "#f5f5f7", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                {balance.coffeeBeans} <CoffeeBeanIcon size={20} />
              </span>
            </div>
          </div>
        </header>

        {/* Approved Projects Showcase */}
        {safeProjects.length > 0 && (
          <section style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 600, marginBottom: "1.5rem", letterSpacing: "-0.015em" }}>
              Your Approved Projects ({safeProjects.length})
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
              {safeProjects.map((proj) => (
                <div key={proj.id} style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "22px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column"
                }}>
                  <div style={{ height: "180px", overflow: "hidden", backgroundColor: "#0a0a0c" }}>
                    <img
                      src={proj.screenshotUrl}
                      alt={proj.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                      }}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ padding: "1.35rem", display: "flex", flexDirection: "column", gap: "1rem", flexGrow: 1, justifyContent: "space-between" }}>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 600 }}>{proj.name}</h3>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      {proj.playableUrl && (
                        <a href={proj.playableUrl} target="_blank" rel="noreferrer" style={{
                          flex: 1, textDecoration: "none", textAlign: "center", padding: "0.55rem 0.75rem",
                          borderRadius: "980px", background: "#0071e3", color: "#fff", fontSize: "0.85rem", fontWeight: 500
                        }}>
                          🌐 Demo
                        </a>
                      )}
                      {proj.codeUrl && (
                        <a href={proj.codeUrl} target="_blank" rel="noreferrer" style={{
                          flex: 1, textDecoration: "none", textAlign: "center", padding: "0.55rem 0.75rem",
                          borderRadius: "980px", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem", fontWeight: 500
                        }}>
                          💻 Code
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Main Store Catalog */}
        <div style={{
          display: "grid",
          gridTemplateColumns: hasCartItems ? "1fr 360px" : "1fr",
          gap: "2rem",
          alignItems: "start",
          transition: "grid-template-columns 0.3s ease"
        }}>
          
          <div>
            {/* Filter Toolbar */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2.5rem",
              flexWrap: "wrap",
              gap: "1.25rem",
              background: "rgba(255, 255, 255, 0.03)",
              backdropFilter: "blur(20px)",
              padding: "1rem 1.5rem",
              borderRadius: "20px",
              border: "1px solid rgba(255, 255, 255, 0.08)"
            }}>
              
              <div
                onClick={() => setShowAffordableOnly((prev) => !prev)}
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", userSelect: "none" }}
              >
                <div style={{
                  width: "48px",
                  height: "28px",
                  backgroundColor: showAffordableOnly ? "#30d158" : "rgba(255, 255, 255, 0.15)",
                  borderRadius: "980px",
                  padding: "2px",
                  transition: "background-color 0.2s ease",
                  display: "flex",
                  alignItems: "center"
                }}>
                  <div style={{
                    width: "24px",
                    height: "24px",
                    backgroundColor: "#ffffff",
                    borderRadius: "50%",
                    transform: showAffordableOnly ? "translateX(20px)" : "translateX(0px)",
                    transition: "transform 0.2s ease",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.3)"
                  }} />
                </div>
                <span style={{ fontSize: "0.95rem", fontWeight: 500, color: "#f5f5f7" }}>
                  Show what I can afford
                </span>
              </div>

              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Search rewards..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: "0.65rem 1.25rem",
                    borderRadius: "980px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    color: "#ffffff",
                    fontSize: "0.9rem",
                    outline: "none"
                  }}
                />

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{
                    padding: "0.65rem 1rem",
                    borderRadius: "980px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    color: "#ffffff",
                    fontSize: "0.9rem",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="default" style={{ background: "#111", color: "#fff" }}>Sort: Default</option>
                  <option value="price-asc" style={{ background: "#111", color: "#fff" }}>Price: Low to High</option>
                  <option value="price-desc" style={{ background: "#111", color: "#fff" }}>Price: High to Low</option>
                  <option value="name" style={{ background: "#111", color: "#fff" }}>Sort by Name</option>
                </select>
              </div>
            </div>

            {/* Reward Cards */}
            {processedRewards.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#86868b" }}>
                <p style={{ fontSize: "1.1rem" }}>No rewards match your current filter settings.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.75rem" }}>
                {processedRewards.map((item) => {
                  const qty = quantities[item.id] || 0;
                  const canAffordThisItem = item.costBeans <= balance.coffeeBeans || item.costHours <= balance.approvedHours;

                  return (
                    <div key={item.id} style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "24px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      opacity: canAffordThisItem ? 1 : 0.55
                    }}>
                      <div style={{
                        height: "210px",
                        backgroundColor: "#0d0d0f",
                        padding: "1.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
                      }}>
                        <img
                          src={item.img}
                          alt={item.alt}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                          }}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.5))"
                          }}
                        />
                      </div>

                      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", flexGrow: 1 }}>
                        <div>
                          <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.2rem", fontWeight: 600, letterSpacing: "-0.01em" }}>{item.name}</h3>
                          <p style={{ color: "#86868b", fontSize: "0.88rem", lineHeight: "1.45", margin: "0 0 1.25rem 0" }}>{item.desc}</p>
                        </div>

                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                            <span style={{ fontWeight: 600, color: "#ff3b30", fontSize: "1.05rem" }}>
                              {item.hoursLabel}
                            </span>
                            <span style={{ fontSize: "0.88rem", color: "#86868b", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                              {item.costBeans} <CoffeeBeanIcon size={16} />
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", background: "rgba(255, 255, 255, 0.06)", borderRadius: "980px", padding: "0.4rem 0.8rem" }}>
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              disabled={qty === 0}
                              style={{
                                background: "none", border: "none", color: qty === 0 ? "#444" : "#fff",
                                fontSize: "1.25rem", cursor: qty === 0 ? "not-allowed" : "pointer", padding: "0 0.5rem"
                              }}
                            >
                              −
                            </button>
                            <span style={{ fontWeight: 600, fontSize: "1rem" }}>{qty}</span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              style={{ background: "none", border: "none", color: "#fff", fontSize: "1.25rem", cursor: "pointer", padding: "0 0.5rem" }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Side Cart */}
          {hasCartItems && (
            <aside style={{
              position: "sticky",
              top: "2.5rem",
              background: "rgba(255, 255, 255, 0.04)",
              backdropFilter: "blur(30px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "28px",
              padding: "2rem",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 600, margin: 0 }}>
                  Order Summary
                </h2>
                <span style={{ background: "#0071e3", padding: "0.25rem 0.75rem", borderRadius: "980px", fontSize: "0.8rem", fontWeight: 600 }}>
                  {selectedItems.reduce((acc, i) => acc + i.quantity, 0)} items
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "280px", overflowY: "auto", marginBottom: "1.5rem", paddingRight: "0.25rem" }}>
                {selectedItems.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.4)", padding: "0.85rem", borderRadius: "14px" }}>
                    <div style={{ flexGrow: 1, paddingRight: "0.5rem" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{item.name}</div>
                      <div style={{ color: "#86868b", fontSize: "0.8rem", marginTop: "0.15rem" }}>
                        {item.costHours * item.quantity} hrs ({item.costBeans * item.quantity} beans)
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", borderRadius: "6px", width: "26px", height: "26px", cursor: "pointer" }}
                      >
                        −
                      </button>
                      <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", borderRadius: "6px", width: "26px", height: "26px", cursor: "pointer" }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: 600 }}>
                  <span>Total Cost:</span>
                  <span>{totalCostHours} hrs / {totalCostBeans} beans</span>
                </div>

                {!canAffordOrder && (
                  <p style={{ color: "#ff453a", fontSize: "0.85rem", fontWeight: 500, marginTop: "0.5rem" }}>
                    ⚠️ Balance insufficient for this selection.
                  </p>
                )}
              </div>

              <textarea
                placeholder="Mailing address, notes, or special requests..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                style={{
                  width: "100%",
                  height: "85px",
                  padding: "0.85rem",
                  borderRadius: "14px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  color: "#ffffff",
                  fontSize: "0.88rem",
                  outline: "none",
                  resize: "none",
                  marginBottom: "1.25rem"
                }}
              />

              <button
                onClick={handleCheckout}
                disabled={!canAffordOrder || isSubmitting}
                style={{
                  width: "100%",
                  padding: "0.95rem",
                  backgroundColor: canAffordOrder ? "#0071e3" : "#333336",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "1rem",
                  border: "none",
                  borderRadius: "980px",
                  cursor: canAffordOrder ? "pointer" : "not-allowed",
                  transition: "background-color 0.2s ease"
                }}
              >
                {isSubmitting ? "Processing..." : "Place Order"}
              </button>

              {statusMsg && (
                <p style={{
                  marginTop: "1.25rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: statusMsg.type === "error" ? "#ff453a" : "#30d158",
                  textAlign: "center"
                }}>
                  {statusMsg.text}
                </p>
              )}
            </aside>
          )}

        </div>
      </div>
    </div>
  );
}
