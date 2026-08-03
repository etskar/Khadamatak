import { BadgeCheck, Heart, MapPin, Star } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type ListingCardProps = {
  href: string;
  title: string;
  priceLabel?: string | null;
  imageUrl?: string | null;
  city?: string | null;
  verified?: boolean;
  rating?: number | null;
  distanceLabel?: string | null;
  badge?: string;
  className?: string;
  favoritesCount?: number;
  noImageLabel?: string;
};

export function ListingCard({
  href,
  title,
  priceLabel,
  imageUrl,
  city,
  verified,
  rating,
  distanceLabel,
  badge,
  className,
  favoritesCount,
  noImageLabel,
}: ListingCardProps) {
  return (
    <Link href={href as "/"} className={cn("group block", className)}>
      <Card className="overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {noImageLabel ?? "No image"}
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
          {badge ? (
            <Badge className="absolute start-2 top-2 backdrop-blur-md" variant="secondary">
              {badge}
            </Badge>
          ) : null}
          {typeof favoritesCount === "number" && favoritesCount > 0 ? (
            <span className="absolute end-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
              <Heart className="h-3 w-3" /> {favoritesCount}
            </span>
          ) : null}
        </div>
        <div className="space-y-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
              {title}
            </h3>
            {verified ? (
              <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" />
            ) : null}
          </div>
          {priceLabel ? (
            <p className="text-sm font-bold text-brand-700 dark:text-brand-300">
              {priceLabel}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {city ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {city}
              </span>
            ) : null}
            {distanceLabel ? <span>{distanceLabel}</span> : null}
            {rating != null && rating > 0 ? (
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-warning text-warning" />
                {rating.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function priceCentsLabel(
  cents: number | null | undefined,
  currency = "EUR",
  locale = "nl-NL",
  pricingType?: string,
) {
  if (cents == null) {
    return pricingType === "quote" ? "Quote" : null;
  }
  const base = formatMoney(cents, currency, locale);
  if (pricingType === "hourly") return `${base}/h`;
  return base;
}
