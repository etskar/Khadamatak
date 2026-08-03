import { BadgeCheck, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type JobCardProps = {
  href: string;
  title: string;
  company: string;
  city?: string | null;
  employmentType?: string;
  salaryMinCents?: number | null;
  salaryMaxCents?: number | null;
  currency?: string;
  salaryPeriod?: string;
  imageUrl?: string | null;
  verified?: boolean;
  distanceLabel?: string | null;
  className?: string;
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  freelance: "Freelance",
  internship: "Internship",
};

export function salaryLabel(
  minCents: number | null | undefined,
  maxCents: number | null | undefined,
  currency = "EUR",
  locale = "nl-NL",
  period = "monthly",
) {
  if (minCents == null && maxCents == null) return null;
  const fmt = (c: number) => formatMoney(c, currency, locale);
  const range =
    minCents != null && maxCents != null && maxCents > minCents
      ? `${fmt(minCents)} – ${fmt(maxCents)}`
      : minCents != null
        ? fmt(minCents)
        : fmt(maxCents ?? 0);
  const per =
    period === "hourly"
      ? "/h"
      : period === "yearly"
        ? "/yr"
        : period === "project"
          ? "/project"
          : "/mo";
  return `${range}${per}`;
}

export function JobCard({
  href,
  title,
  company,
  city,
  employmentType,
  salaryMinCents,
  salaryMaxCents,
  currency,
  salaryPeriod,
  imageUrl,
  verified,
  distanceLabel,
  className,
}: JobCardProps) {
  return (
    <Link href={href as "/"} className={cn("block", className)}>
      <Card className="flex items-center gap-3 p-3 transition hover:shadow-md sm:gap-4 sm:p-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-16 sm:w-16">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <span className="text-lg font-bold">
                {company.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold leading-snug sm:text-base">
              {title}
            </h3>
            {verified ? (
              <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" />
            ) : null}
          </div>
          <p className="line-clamp-1 text-xs text-muted-foreground sm:text-sm">
            {company}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            {salaryLabel(
              salaryMinCents,
              salaryMaxCents,
              currency,
              "nl-NL",
              salaryPeriod,
            ) ? (
              <span className="font-semibold text-brand-700 dark:text-brand-300">
                {salaryLabel(
                  salaryMinCents,
                  salaryMaxCents,
                  currency,
                  "nl-NL",
                  salaryPeriod,
                )}
              </span>
            ) : null}
            {employmentType ? (
              <Badge variant="secondary">
                {EMPLOYMENT_TYPE_LABELS[employmentType] ?? employmentType}
              </Badge>
            ) : null}
            {city ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {city}
              </span>
            ) : null}
            {distanceLabel ? <span>{distanceLabel}</span> : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
