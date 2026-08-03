"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  BadgeCheck,
  Building2,
  Clock,
  Flag,
  MapPin,
  MessageCircle,
  Share2,
  Tag,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import {
  contactSellerAction,
  reportListingAction,
} from "@/server/actions/marketplace-actions";
import { salaryLabel } from "./job-card";
import { TravelInfo } from "./travel-info";

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  freelance: "Freelance",
  internship: "Internship",
};

const APPLY_METHOD_LABELS: Record<string, string> = {
  message: "Via message",
  email: "Via email",
  external: "External link",
};

type Props = {
  job: {
    publicId: string;
    id: string;
    title: string;
    company: string;
    description: string;
    requirements: string | null;
    salaryMinCents: number | null;
    salaryMaxCents: number | null;
    currency: string;
    salaryPeriod: string;
    employmentType: string;
    workHours: string | null;
    applyMethod: string;
    applyUrl: string | null;
    applyEmail: string | null;
    city: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    viewsCount: number;
    media: { id: string; type: string; url: string }[];
    employer: {
      id: string;
      name: string;
      username: string;
      avatarUrl?: string | null;
      verified: boolean;
    };
    isOwner: boolean;
    publishedAt: string;
    travel: {
      originLat: number;
      originLng: number;
      destLat: number;
      destLng: number;
      distanceKm: number;
    } | null;
  };
  labels: Record<string, string>;
};

export function JobDetailClient({ job, labels }: Props) {
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const tCommon = useTranslations("common");
  const media = job.media;

  const salary = salaryLabel(
    job.salaryMinCents,
    job.salaryMaxCents,
    job.currency,
    "nl-NL",
    job.salaryPeriod,
  );

  return (
    <div className="grid gap-5 animate-in-up lg:grid-cols-5">
      <div className="space-y-3 lg:col-span-3">
        {media.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-muted">
            {media[active]?.type === "video" ? (
              <video
                src={media[active].url}
                controls
                className="aspect-[16/9] w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media[active]?.url}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
            )}
          </div>
        ) : null}
        {media.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActive(i)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border ${
                  i === active ? "border-brand-600" : "border-border"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{job.title}</h1>
                {job.employer.verified ? (
                  <Badge variant="success" className="gap-1">
                    <BadgeCheck className="h-3 w-3" />
                    {labels.verified}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {job.company}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {salary ? (
                <Badge className="gap-1 text-sm">
                  <Tag className="h-3.5 w-3.5" />
                  {salary}
                </Badge>
              ) : null}
              <Badge variant="secondary">
                {EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType}
              </Badge>
              {job.workHours ? (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {job.workHours}
                </Badge>
              ) : null}
              {job.city ? (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[job.city, job.country].filter(Boolean).join(", ")}
                </Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {labels.views}: {job.viewsCount}
              </span>
            </div>

            <div className="space-y-4 pt-2">
              <section>
                <h2 className="mb-1.5 font-semibold">{labels.requirements}</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {job.requirements || "—"}
                </p>
              </section>
              <section>
                <h2 className="mb-1.5 font-semibold">Description</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {job.description}
                </p>
              </section>
              <section className="rounded-xl bg-muted/50 p-3 text-sm">
                <span className="font-semibold">{labels.applyMethod}: </span>
                {APPLY_METHOD_LABELS[job.applyMethod] ?? job.applyMethod}
              </section>
            </div>
          </CardContent>
        </Card>

        {(job.latitude != null && job.longitude != null) || job.city ? (
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-2 font-semibold">{labels.location}</h2>
              <p className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[job.city, job.country].filter(Boolean).join(", ")}
              </p>
              {job.travel ? (
                <TravelInfo
                  originLat={job.travel.originLat}
                  originLng={job.travel.originLng}
                  destLat={job.travel.destLat}
                  destLng={job.travel.destLng}
                  distanceKm={job.travel.distanceKm}
                  labels={{
                    travelTime: labels.travelTime,
                    directions: labels.directions,
                    viewOnMap: labels.viewOnMap,
                  }}
                />
              ) : null}
              {job.latitude != null && job.longitude != null ? (
                <iframe
                  title="map"
                  className="mt-3 h-56 w-full rounded-xl border border-border"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${job.longitude - 0.02}%2C${job.latitude - 0.02}%2C${job.longitude + 0.02}%2C${job.latitude + 0.02}&layer=mapnik&marker=${job.latitude}%2C${job.longitude}`}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-3 lg:col-span-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <Link
              href={`/profile/${job.employer.username}`}
              className="flex items-center gap-3"
            >
              <Avatar
                src={job.employer.avatarUrl}
                fallback={job.employer.name}
                size="lg"
              />
              <div>
                <p className="font-semibold">{job.employer.name}</p>
                <p className="text-xs text-muted-foreground">{job.company}</p>
              </div>
            </Link>

            {!job.isOwner ? (
              <Button
                fullWidth
                size="lg"
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      const res = await contactSellerAction(job.employer.id);
                      router.push(`/messages/${res.conversationId}`);
                    } catch {
                      toast({ title: labels.loginRequired, variant: "warning" });
                    }
                  })
                }
              >
                <MessageCircle className="h-4 w-4" />
                {labels.apply}
              </Button>
            ) : (
              <Link
                href="/sell"
                className="flex h-11 items-center justify-center rounded-xl border border-border text-sm font-semibold"
              >
                Dashboard
              </Link>
            )}

            {job.applyMethod === "email" && job.applyEmail ? (
              <a
                href={`mailto:${job.applyEmail}`}
                className="flex h-11 items-center justify-center rounded-xl border border-border text-sm font-semibold"
              >
                {job.applyEmail}
              </a>
            ) : null}
            {job.applyMethod === "external" && job.applyUrl ? (
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
              >
                {labels.apply}
              </a>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(window.location.href);
                  toast({ title: tCommon("success"), variant: "success" });
                }}
              >
                <Share2 className="h-4 w-4" />
                {labels.share}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await reportListingAction("job", job.id, "spam");
                      toast({ title: tCommon("success"), variant: "success" });
                    } catch {
                      toast({ title: labels.loginRequired, variant: "warning" });
                    }
                  })
                }
              >
                <Flag className="h-4 w-4" />
                {labels.report}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
