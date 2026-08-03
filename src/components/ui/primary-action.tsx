import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type PrimaryActionProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  className?: string;
  variant?: "primary" | "outline";
};

/**
 * The application's primary call-to-action. Gradient pill with icon,
 * glow shadow and a subtle hover lift — consistent across the platform.
 */
export function PrimaryAction({
  href,
  icon: Icon,
  label,
  className,
  variant = "primary",
}: PrimaryActionProps) {
  return (
    <Link
      href={href as "/"}
      className={cn(
        "group inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-all duration-200 active:scale-[0.97] sm:px-5",
        variant === "primary"
          ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow hover:-translate-y-0.5 hover:shadow-lg hover:brightness-110"
          : "border border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-brand-300 hover:bg-muted hover:shadow-sm",
        className,
      )}
    >
      <Icon
        className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110"
        strokeWidth={2.25}
      />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}
