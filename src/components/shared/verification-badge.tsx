import { BadgeCheck, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export function VerificationBadge({
  verified,
  compact = false,
}: {
  verified: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("marketplace");

  if (verified) {
    return (
      <Badge variant="success" className="gap-1">
        <BadgeCheck className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        {!compact ? t("verified") : null}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <ShieldAlert className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {!compact ? t("unverified") : null}
    </Badge>
  );
}
