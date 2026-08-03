import Image from "next/image";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/config/site";

type LogoProps = {
  className?: string;
  showWordmark?: boolean;
  href?: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: { mark: 32, text: "text-base" },
  md: { mark: 40, text: "text-lg" },
  lg: { mark: 48, text: "text-xl" },
} as const;

export function Logo({
  className,
  showWordmark = true,
  href = "/",
  size = "md",
}: LogoProps) {
  const sizes = sizeMap[size];

  return (
    <Link
      href={href}
      aria-label={siteConfig.name}
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <Image
        src="/logo.png"
        alt=""
        width={sizes.mark}
        height={sizes.mark}
        className="shrink-0"
      />
      {showWordmark ? (
        <span className={cn("font-bold tracking-tight text-foreground", sizes.text)}>
          <span className="text-brand-700 dark:text-brand-400">
            {siteConfig.name}
          </span>
        </span>
      ) : null}
    </Link>
  );
}
