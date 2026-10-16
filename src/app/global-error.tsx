"use client";

/**
 * Last-resort error page, used only if the root layout itself fails. It replaces
 * the whole document, so it can't use the site's styles: everything is inline.
 */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f5f5f5",
          color: "#111",
          textAlign: "center",
          padding: 16,
        }}
      >
        <title>Something went wrong · Sparks</title>
        <div>
          <h1 style={{ fontSize: 32, letterSpacing: "-0.02em", margin: 0 }}>Something went wrong.</h1>
          <p style={{ color: "#666" }}>Sparks couldn&apos;t load. Please try again in a moment.</p>
          <button
            onClick={retry}
            style={{ background: "#111", color: "#fff", border: 0, padding: "10px 20px", fontSize: 14, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
