import { ImageResponse } from "next/og";

export const alt = "MapleCompile — MapleStory Calculators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background:
            "linear-gradient(135deg, #0b1220 0%, #132038 45%, #1a2f4a 100%)",
          color: "#f4f7fb",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "rgba(232, 93, 74, 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              color: "#e85d4a",
            }}
          >
            ❋
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: -1.5,
              color: "#e85d4a",
            }}
          >
            MapleCompile
          </div>
        </div>
        <div
          style={{
            fontSize: 36,
            lineHeight: 1.35,
            maxWidth: 900,
            opacity: 0.92,
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          }}
        >
          Character lookup, scouter, gear, boss income, and HEXA tools for
          MapleStory GMS.
        </div>
      </div>
    ),
    { ...size },
  );
}
