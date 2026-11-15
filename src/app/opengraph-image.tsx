import { ImageResponse } from "next/og";
import { personalInfo } from "@/data/portfolio";

export const alt = `${personalInfo.name} — ${personalInfo.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT = "#29d6b9";

// Rendered once at build time; the root segment's image is inherited by every
// route that does not supply its own.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#f1f5f9",
          background:
            "radial-gradient(circle at 85% 10%, rgba(41,214,185,0.22), rgba(11,16,32,0) 55%), #0b1020",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: ACCENT,
          }}
        >
          <div style={{ width: 44, height: 4, background: ACCENT, borderRadius: 2 }} />
          {personalInfo.role}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
            {personalInfo.name}
          </div>
          <div style={{ fontSize: 34, lineHeight: 1.35, color: "#94a3b8", maxWidth: 980 }}>
            {personalInfo.tagline}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: ACCENT }}>nikunj.codenex.dev</div>
      </div>
    ),
    size,
  );
}
