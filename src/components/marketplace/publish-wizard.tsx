"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Check, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  createProductAction,
  createServiceAction,
} from "@/server/actions/marketplace-actions";
import { toast } from "@/components/ui/toast";
import { CountryCitySelect } from "./country-city-select";
import { AddressAutocomplete } from "./address-autocomplete";
import { MediaUploader, type MediaItem } from "./media-uploader";
import { cn } from "@/lib/utils";

type Props = {
  kind: "product" | "service";
  categories: { id: string; label: string }[];
};

const STEP_LABELS: Record<"product" | "service", string[]> = {
  product: ["Basics", "Location", "Media & Review"],
  service: ["Basics", "Location", "Media & Review"],
};

export function PublishWizard({ kind, categories }: Props) {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [country, setCountry] = useState("NL");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [basics, setBasics] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const steps = STEP_LABELS[kind];

  function setField(name: string, value: string) {
    setBasics((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: false }));
  }

  function validateBasics(): boolean {
    const required = ["title", "description"];
    const missing: Record<string, boolean> = {};
    for (const f of required) {
      if (!(basics[f] ?? "").trim()) missing[f] = true;
    }
    if (kind === "product" && !(basics.price ?? "").trim()) missing.price = true;
    setErrors(missing);
    return Object.keys(missing).length === 0;
  }

  function validateLocation(): boolean {
    if (!city.trim()) {
      toast({ title: "Please select a city", variant: "warning" });
      return false;
    }
    return true;
  }

  function submit() {
    const fd = new FormData();
    for (const [k, v] of Object.entries(basics)) fd.set(k, v);
    fd.set("country", country);
    fd.set("city", city);
    fd.set("addressLine", address);
    if (lat != null) fd.set("latitude", String(lat));
    if (lng != null) fd.set("longitude", String(lng));
    for (const m of media) fd.append("media", m.file);

    startTransition(async () => {
      try {
        const res =
          kind === "product"
            ? await createProductAction(fd)
            : await createServiceAction(fd);
        router.push(`/${kind === "product" ? "products" : "services"}/${res.publicId}`);
      } catch (err) {
        toast({
          title: err instanceof Error ? err.message : tCommon("error"),
          variant: "danger",
        });
      }
    });
  }

  function next() {
    if (step === 0 && !validateBasics()) return;
    if (step === 1 && !validateLocation()) return;
    setStep((s) => s + 1);
  }

  return (
    <Card>
      <CardContent className="p-5">
        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-1.5">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  i <= step ? "bg-brand-600" : "bg-muted",
                )}
              />
              <span
                className={cn(
                  "flex items-center gap-1 text-[11px] font-medium",
                  i <= step ? "text-brand-700 dark:text-brand-300" : "text-muted-foreground",
                )}
              >
                {i < step ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px]">
                    {i + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{label}</span>
              </span>
            </div>
          ))}
        </div>

        {step === 0 ? (
          <div className="space-y-3 animate-fade-in">
            <Input
              name="title"
              label={t("title")}
              required
              value={basics.title ?? ""}
              onChange={(e) => setField("title", e.target.value)}
              error={errors.title ? tCommon("required") : undefined}
            />
            <Textarea
              name="description"
              label={t("description")}
              required
              value={basics.description ?? ""}
              onChange={(e) => setField("description", e.target.value)}
              error={errors.description ? tCommon("required") : undefined}
            />
            <select
              name="categoryId"
              value={basics.categoryId ?? ""}
              onChange={(e) => setField("categoryId", e.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
            >
              <option value="">{t("allCategories")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {kind === "product" ? (
              <>
                <Input
                  name="price"
                  type="number"
                  step="0.01"
                  label={t("price")}
                  required
                  value={basics.price ?? ""}
                  onChange={(e) => setField("price", e.target.value)}
                  error={errors.price ? tCommon("required") : undefined}
                />
                <select
                  name="condition"
                  value={basics.condition ?? "used"}
                  onChange={(e) => setField("condition", e.target.value)}
                  className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
                >
                  <option value="new">new</option>
                  <option value="like_new">like_new</option>
                  <option value="used">used</option>
                  <option value="for_parts">for_parts</option>
                </select>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    name="pricingType"
                    value={basics.pricingType ?? "fixed"}
                    onChange={(e) => setField("pricingType", e.target.value)}
                    className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
                  >
                    <option value="fixed">fixed</option>
                    <option value="hourly">hourly</option>
                    <option value="quote">quote</option>
                  </select>
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    label={t("price")}
                    value={basics.price ?? ""}
                    onChange={(e) => setField("price", e.target.value)}
                  />
                </div>
                <Input
                  name="availability"
                  label={t("availability")}
                  value={basics.availability ?? ""}
                  onChange={(e) => setField("availability", e.target.value)}
                />
                <Input
                  name="workingHours"
                  label={t("workingHours")}
                  value={basics.workingHours ?? ""}
                  onChange={(e) => setField("workingHours", e.target.value)}
                />
              </>
            )}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-brand-600" />
              {t("location")}
            </div>
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
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4 animate-fade-in">
            <MediaUploader
              label={t("media")}
              items={media}
              onChange={setMedia}
            />
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <p className="font-semibold">{basics.title}</p>
              <p className="mt-1 line-clamp-2 text-muted-foreground">{basics.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {city}
                {address ? ` · ${address}` : ""}
                {lat != null && lng != null ? " · coords ✓" : ""}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || pending}
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            {tCommon("back")}
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={next}>
              {tCommon("continue")}
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          ) : (
            <Button type="button" loading={pending} onClick={submit}>
              {t("publish")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
