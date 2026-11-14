"use client";

// Replaces the root layout when it fails, so it brings its own <html> and
// <body> and cannot rely on the app's stylesheet or providers.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1020",
          color: "#f1f5f9",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <main>
          <h1 style={{ fontSize: 32, marginBottom: 16 }}>Something went wrong</h1>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "12px 28px",
              borderRadius: 999,
              border: 0,
              background: "#29d6b9",
              color: "#0b1020",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
