"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Briefcase,
  Clock,
  Coins,
  Contact,
  ImageIcon,
  MapPin,
  Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountryCitySelect } from "@/components/marketplace/country-city-select";
import { AddressAutocomplete } from "@/components/marketplace/address-autocomplete";
import { MediaUploader, type MediaItem } from "@/components/marketplace/media-uploader";
import { createJobAction } from "@/server/actions/marketplace-actions";
import { toast } from "@/components/ui/toast";
import { getFriendlyError } from "@/lib/friendly-errors";
import { cn } from "@/lib/utils";

const WORKING_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const SALARY_PERIODS = ["hourly", "daily", "weekly", "monthly", "yearly", "negotiable"] as const;
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship", "freelance"] as const;
const CONTACT_METHODS = ["message", "email", "both"] as const;

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
        <Icon className="h-4 w-4" />
      </span>
      {title}
    </h3>
  );
}

export function JobPublishForm({
  categories,
}: {
  categories: { id: string; label: string }[];
}) {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [country, setCountry] = useState("NL");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [days, setDays] = useState<string[]>(["MON", "TUE", "WED", "THU", "FRI"]);
  const [applyMethod, setApplyMethod] = useState<(typeof CONTACT_METHODS)[number]>("message");
  const [media, setMedia] = useState<MediaItem[]>([]);

  function toggleDay(day: string) {
    setDays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day]));
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("country", country);
            fd.set("city", city);
            fd.set("addressLine", address);
            if (lat != null) fd.set("latitude", String(lat));
            if (lng != null) fd.set("longitude", String(lng));
            fd.set(
              "workHours",
              JSON.stringify({ start: workStart, end: workEnd, days }),
            );
            fd.set("applyMethod", applyMethod);
            for (const m of media) fd.append("media", m.file);
            startTransition(async () => {
              try {
                const res = await createJobAction(fd);
                router.push(`/jobs/${res.publicId}`);
              } catch (err) {
                toast({
                  title: getFriendlyError(err, tCommon),
                  variant: "danger",
                });
              }
            });
          }}
        >
          {/* ─── Basic Information ─── */}
          <section className="space-y-3">
            <SectionHeading icon={Briefcase} title={t("basicInfo")} />
            <Input name="title" label={t("jobTitle")} required />
            <Input name="company" label={t("company")} required />
            <select
              name="categoryId"
              className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
            >
              <option value="">{t("allCategories")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <Textarea name="description" label={t("description")} required />
            <Textarea name="requirements" label={t("requirements")} />
          </section>

          {/* ─── Salary ─── */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeading icon={Coins} title={t("salarySection")} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="salaryMin" type="number" step="0.01" label={t("salaryMin")} />
              <Input name="salaryMax" type="number" step="0.01" label={t("salaryMax")} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t("salaryPeriod")}
              </label>
              <select
                name="salaryPeriod"
                defaultValue="monthly"
                className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
              >
                {SALARY_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {t(`salaryPeriods.${p}`)}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* ─── Employment ─── */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeading icon={Clock} title={t("employmentSection")} />
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t("employmentType")}
              </label>
              <div className="flex flex-wrap gap-2">
                {EMPLOYMENT_TYPES.map((et) => (
                  <label
                    key={et}
                    className={cn(
                      "cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition",
                      "has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700 dark:has-[:checked]:bg-brand-900/30",
                    )}
                  >
                    <input type="radio" name="employmentType" value={et} defaultChecked={et === "full_time"} className="hidden" />
                    {t(`employmentTypes.${et}`)}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t("workStart")}</label>
                <input
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t("workEnd")}</label>
                <input
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("workingDays")}</label>
              <div className="flex flex-wrap gap-1.5">
                {WORKING_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={cn(
                      "h-10 w-12 rounded-xl border text-xs font-semibold transition",
                      days.includes(d)
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                    aria-pressed={days.includes(d)}
                  >
                    {t(`days.${d}`)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ─── Contact Method ─── */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeading icon={Contact} title={t("contactSection")} />
            <div className="flex flex-wrap gap-2">
              {CONTACT_METHODS.map((m) => (
                <label
                  key={m}
                  className={cn(
                    "cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition",
                    "has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700 dark:has-[:checked]:bg-brand-900/30",
                  )}
                >
                  <input
                    type="radio"
                    name="applyMethod"
                    value={m}
                    checked={applyMethod === m}
                    onChange={() => setApplyMethod(m)}
                    className="hidden"
                  />
                  {t(`contactMethods.${m}`)}
                </label>
              ))}
            </div>
            {applyMethod === "email" || applyMethod === "both" ? (
              <Input name="applyEmail" label={t("applyEmail")} type="email" />
            ) : null}
            {applyMethod === "both" ? (
              <p className="text-xs text-muted-foreground">{t("bothHint")}</p>
            ) : null}
          </section>

          {/* ─── Location ─── */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeading icon={MapPin} title={t("locationSection")} />
            <CountryCitySelect
              country={country}
              city={city}
              countryLabel={t("country")}
              cityLabel={t("city")}
              allCountriesLabel={t("allCountries")}
              allCitiesLabel={t("allCities")}
              onCountryChange={(code) => {
                setCountry(code);
                setCity("");
              }}
              onCityChange={setCity}
            />
            <AddressAutocomplete
              label={t("address")}
              placeholder={t("addressPlaceholder")}
              countryCode={country}
              value={address}
              onAddressChange={setAddress}
              onCoordinatesChange={(la, ln) => {
                setLat(la);
                setLng(ln);
              }}
            />
            {lat != null && lng != null ? (
              <p className="flex items-center gap-1 text-xs text-success">
                <MapPin className="h-3 w-3" />
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            ) : null}
          </section>

          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeading icon={ImageIcon} title={t("mediaSection")} />
            <MediaUploader label={t("media")} items={media} onChange={setMedia} />
          </section>

          <Button type="submit" fullWidth size="lg" loading={pending}>
            <Save className="h-4 w-4" />
            {t("publish")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
