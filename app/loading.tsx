export default function Loading() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#05070e",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "#8d99ae",
      fontFamily: "'Space Grotesk', sans-serif"
    }}>
      <div style={{
        width: "42px",
        height: "42px",
        border: "3px solid rgba(255, 255, 255, 0.1)",
        borderTop: "3px solid #ffb454",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        marginBottom: "1rem"
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <p style={{ fontSize: "0.95rem", letterSpacing: "0.05em", color: "#f5ede0" }}>
        Loading 3AM YSWS...
      </p>
    </div>
  );
}
