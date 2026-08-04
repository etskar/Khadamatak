"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CountryCitySelect } from "@/components/marketplace/country-city-select";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { submitVerificationAction } from "@/server/actions/profile-actions";
import { toast } from "@/components/ui/toast";
import { getFriendlyError } from "@/lib/friendly-errors";
import { useRouter } from "@/i18n/navigation";

type Props = {
  status: string;
  rejectionReason?: string | null;
  fullName: string;
};

export function VerificationClient(props: Props) {
  const t = useTranslations("verification");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [country, setCountry] = useState("NL");
  const [city, setCity] = useState("");
  const [governmentId, setGovernmentId] = useState<{ file: File; url: string } | null>(null);
  const [selfie, setSelfie] = useState<{ file: File; url: string } | null>(null);
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-in-up">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <Card className="border-brand-200 bg-brand-50/40 dark:bg-brand-950/20">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-700" />
            <p className="font-semibold">{t("whyTitle")}</p>
            <Badge className="ms-auto">{props.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t("whyBody")}</p>
        </CardContent>
      </Card>

      {props.status === "rejected" && props.rejectionReason ? (
        <Card className="border-danger/30 bg-[var(--danger-soft)]/40">
          <CardContent className="p-4 text-sm text-danger">
            {t("rejected")}: {props.rejectionReason}
          </CardContent>
        </Card>
      ) : null}

      {props.status === "verified" ? (
        <Card>
          <CardContent className="p-6 text-center">
            <BadgeCheck className="mx-auto h-12 w-12 text-success" />
            <p className="mt-3 text-lg font-semibold">{t("verifiedTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("verifiedBody")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-5">
          <form
            action={(fd) => {
              fd.set("country", country);
              fd.set("city", city);
              if (governmentId) fd.set("governmentId", governmentId.file);
              if (selfie) fd.set("selfie", selfie.file);
              startTransition(async () => {
                try {
                  await submitVerificationAction(fd);
                  toast({ title: t("submitted"), variant: "success" });
                  router.refresh();
                } catch (e) {
                  toast({
                    title: getFriendlyError(e, tCommon),
                    variant: "danger",
                  });
                }
              });
            }}
            className="space-y-3"
          >
            <h3 className="font-semibold">{t("identityStep")}</h3>

            <Input
              name="fullName"
              label={t("fullName")}
              defaultValue={props.fullName}
              required
            />
            <Input name="addressLine1" label={t("address1")} required />
            <Input name="addressLine2" label={t("address2")} />

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

            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="postalCode" label={t("postal")} required />
              <Input
                name="nationalId"
                label={t("nationalId")}
                placeholder={t("nationalIdPlaceholder")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">
                  {t("idUpload")} <span className="text-danger">*</span>
                </p>
                <ImageUploadField
                  label={t("idUpload")}
                  aspect={4 / 3}
                  previewUrl={governmentId?.url ?? null}
                  onFile={(file) => {
                    if (file) {
                      setGovernmentId({ file, url: URL.createObjectURL(file) });
                    } else {
                      setGovernmentId(null);
                    }
                  }}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">
                  {t("selfieUpload")} <span className="text-xs text-muted-foreground">({tCommon("optional")})</span>
                </p>
                <ImageUploadField
                  label={t("selfieUpload")}
                  aspect={1}
                  circular
                  previewUrl={selfie?.url ?? null}
                  onFile={(file) => {
                    if (file) {
                      setSelfie({ file, url: URL.createObjectURL(file) });
                    } else {
                      setSelfie(null);
                    }
                  }}
                />
                <p className="mt-1 text-xs text-muted-foreground">{t("selfieHint")}</p>
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="termsAccepted" className="mt-1" required />
              <span>{t("terms")}</span>
            </label>

            <Button
              type="submit"
              fullWidth
              loading={pending}
              disabled={!governmentId}
            >
              {t("submit")}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
