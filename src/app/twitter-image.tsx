import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background:
            "linear-gradient(135deg,#042f2e 0%,#0f766e 45%,#115e59 80%,#134e4a 100%)",
          padding: 80,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -100,
            width: 420,
            height: 420,
            borderRadius: 999,
            background: "rgba(45,212,191,0.16)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 32,
            background:
              "linear-gradient(135deg,#2dd4bf 0%,#14b8a6 50%,#0d9488 100%)",
            fontSize: 76,
            fontWeight: 800,
            color: "#ffffff",
          }}
        >
          K
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 76,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.02em",
          }}
        >
          Khadamatak
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 32,
            color: "#99f6e4",
            maxWidth: 780,
            lineHeight: 1.4,
          }}
        >
          خدماتك بين يديك — Discover, connect & get it done
        </div>
      </div>
    ),
    { ...size },
  );
}
