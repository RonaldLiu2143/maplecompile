import { ImageResponse } from "next/og";
import { MAPLE_LEAF_D, MAPLE_STEM_D } from "@/lib/maple-leaf";
import { DEFAULT_THEME_COLOR } from "@/lib/theme";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
        }}
      >
        <svg width="140" height="140" viewBox="0 0 32 32" fill="none">
          <path
            d={MAPLE_STEM_D}
            stroke={DEFAULT_THEME_COLOR}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d={MAPLE_LEAF_D}
            stroke={DEFAULT_THEME_COLOR}
            strokeWidth="1.55"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
