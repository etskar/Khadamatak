import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type LogoProps = {
  className?: string;
  showWordmark?: boolean;
  href?: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: { mark: "h-8 w-8 text-sm", text: "text-base" },
  md: { mark: "h-10 w-10 text-base", text: "text-lg" },
  lg: { mark: "h-12 w-12 text-lg", text: "text-xl" },
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
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 font-bold text-white shadow-glow",
          sizes.mark,
        )}
        aria-hidden
      >
        خ
      </span>
      {showWordmark ? (
        <span className={cn("font-bold tracking-tight text-foreground", sizes.text)}>
          <span className="text-brand-700 dark:text-brand-400">Khadamatak</span>
        </span>
      ) : null}
    </Link>
  );
}
