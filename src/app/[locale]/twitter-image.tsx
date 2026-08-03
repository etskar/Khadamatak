import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoBase64 = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public", "logo.png"),
).toString("base64")}`;

export default async function TwitterImage({
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoBase64}
          alt=""
          width={120}
          height={120}
          style={{ borderRadius: 32 }}
        />
        <div
          style={{
            marginTop: 40,
            fontSize: 76,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.02em",
          }}
        >
          {brandName}
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
          {tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
