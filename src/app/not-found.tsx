import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>404</h1>
          <p style={{ color: "#64748b", marginBottom: 16 }}>Page not found</p>
          <Link
            href="/ar"
            style={{
              display: "inline-flex",
              padding: "10px 16px",
              borderRadius: 12,
              background: "#0d9488",
              color: "white",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            خدماتك
          </Link>
        </div>
      </body>
    </html>
  );
}
