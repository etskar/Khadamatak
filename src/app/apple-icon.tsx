import { ImageResponse } from "next/og";

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
          background: "linear-gradient(135deg,#14b8a6 0%,#0d9488 55%,#115e59 100%)",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 28,
            background: "rgba(255,255,255,0.16)",
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: 64,
              fontWeight: 800,
              fontFamily: "Geist, sans-serif",
            }}
          >
            K
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
