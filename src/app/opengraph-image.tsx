import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

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
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg,#042f2e 0%,#0f766e 45%,#115e59 80%,#134e4a 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 420,
            height: 420,
            borderRadius: 999,
            background: "rgba(45,212,191,0.16)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            left: -60,
            width: 460,
            height: 460,
            borderRadius: 999,
            background: "rgba(251,146,60,0.12)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 128,
            height: 128,
            borderRadius: 36,
            background:
              "linear-gradient(135deg,#2dd4bf 0%,#14b8a6 50%,#0d9488 100%)",
            boxShadow: "0 24px 48px rgba(20,184,166,0.35)",
            fontSize: 84,
            fontWeight: 800,
            color: "#ffffff",
          }}
        >
          K
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 40,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            Khadamatak
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#99f6e4",
              marginTop: 16,
              maxWidth: 720,
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            خدماتك بين يديك — Discover, connect & get it done
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 36,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 24,
            fontWeight: 600,
            color: "#5eead4",
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "#5eead4" }} />
          {siteConfig.url.replace(/^https?:\/\//, "")}
        </div>
      </div>
    ),
    { ...size },
  );
}
