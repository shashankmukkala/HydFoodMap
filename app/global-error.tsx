"use client";

/**
 * The last resort: an error thrown by the root layout itself, which
 * `app/error.tsx` cannot catch because that boundary lives *inside* the
 * layout it would need to replace.
 *
 * This file replaces the root layout while it is active, so it must ship
 * its own <html> and <body> — and it gets none of what the layout
 * provides: no globals.css, no loaded fonts, no CSS custom properties.
 * Everything here is therefore inline and self-contained, with the ivory
 * palette hardcoded rather than read from --paper/--ink, which do not
 * exist in this tree. That is the one place in this codebase where
 * hardcoding those hex values is correct.
 *
 * The realistic trigger is a missing NEXT_PUBLIC_SUPABASE_* at boot
 * (lib/supabase.ts throws by design when it is unset), which is exactly
 * the case where a blank white screen tells the operator nothing.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 1.25rem",
          background: "#f7f3ec",
          color: "#24211e",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: "32rem", width: "100%" }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#24211e7a",
            }}
          >
            Something broke
          </p>
          <h1 style={{ margin: "0.75rem 0 0", fontSize: "2rem", lineHeight: 1.1, fontWeight: 500 }}>
            HydCafeMap couldn’t start.
          </h1>
          <p style={{ margin: "1rem 0 0", fontSize: 15, lineHeight: 1.6, color: "#24211ea8" }}>
            This is a problem on our side. Try again in a moment.
          </p>

          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "2rem",
              padding: "0.7rem 1.4rem",
              fontSize: 14,
              fontWeight: 600,
              color: "#f7f3ec",
              background: "#24211e",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Try again
          </button>

          {error.digest && (
            <p
              style={{
                margin: "2.5rem 0 0",
                fontSize: 11,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                color: "#24211e7a",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
