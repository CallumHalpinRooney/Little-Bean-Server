import { ImageResponse } from "next/og";
import { siteConfig } from "@/site.config";

/**
 * Default social sharing image, generated at build time so no design file has
 * to be maintained. Per-page images can be added with a sibling
 * opengraph-image.tsx in that route folder.
 */
export const alt = `${siteConfig.company.name} — ${siteConfig.company.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#070c18",
          color: "#eaeef7",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: "#2dd4bf",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ width: 26, height: 3, borderRadius: 2, backgroundColor: "#04231f" }} />
            <div style={{ width: 20, height: 3, borderRadius: 2, backgroundColor: "#04231f" }} />
            <div style={{ width: 13, height: 3, borderRadius: 2, backgroundColor: "#04231f" }} />
          </div>
          <div style={{ fontSize: 30, letterSpacing: -0.5 }}>{siteConfig.company.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, lineHeight: 1.1, letterSpacing: -2, maxWidth: 940 }}>
            Know where your data protection risk sits — then close it, and prove it.
          </div>
          <div style={{ fontSize: 28, color: "#a3b2cd" }}>{siteConfig.company.tagline}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#a3b2cd" }}>
          <span>Assessment · Remediation · Training · Attestation</span>
          <span style={{ color: "#d9b678" }}>Ireland &amp; the EU</span>
        </div>
      </div>
    ),
    size,
  );
}
