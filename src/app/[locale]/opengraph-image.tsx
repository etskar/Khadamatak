import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoBase64 = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public", "logo.png"),
).toString("base64")}`;

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const brandName =
    siteConfig.nameByLocale[locale as keyof typeof siteConfig.nameByLocale] ??
    siteConfig.name;
  const tagline = siteConfig.description[locale as "ar" | "nl"] ?? "";

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoBase64}
          alt=""
          width={140}
          height={140}
          style={{
            borderRadius: 36,
            boxShadow: "0 24px 48px rgba(20,184,166,0.35)",
          }}
        />
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
            {brandName}
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
            {tagline}
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
