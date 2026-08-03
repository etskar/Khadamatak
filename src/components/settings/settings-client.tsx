"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { Mail, Phone, User } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { CountryCitySelect } from "@/components/marketplace/country-city-select";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { VerificationBadge } from "@/components/shared/verification-badge";
import {
  LANGUAGE_SUGGESTIONS,
  EDUCATION_SUGGESTIONS,
  OCCUPATION_SUGGESTIONS,
  HOBBY_SUGGESTIONS,
} from "@/lib/suggestions";
import {
  changePasswordAction,
  updatePreferencesAction,
  updateProfileAction,
  uploadAvatarAction,
  uploadCoverAction,
} from "@/server/actions/profile-actions";
import { toast } from "@/components/ui/toast";
import { getFriendlyError } from "@/lib/friendly-errors";

type Props = {
  locale: string;
  profile: {
    displayName: string;
    username: string;
    email: string;
    phone: string;
    bio: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    country: string;
    city: string;
    work: string;
    education: string;
    hobbies: string;
    languages: string;
    website: string;
    contactEmail: string;
    contactPhone: string;
    theme: string;
    notificationsOn: boolean;
    verificationStatus: string;
  };
  logoutAction: () => Promise<void>;
};

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* ignore */
  }
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function joinList(values: string[]): string {
  return values.join(", ");
}

export function SettingsClient({ locale, profile, logoutAction }: Props) {
  const t = useTranslations("settings");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [country, setCountry] = useState(profile.country);
  const [city, setCity] = useState(profile.city);
  const [languages, setLanguages] = useState<string[]>(parseList(profile.languages));
  const [hobbies, setHobbies] = useState<string[]>(parseList(profile.hobbies));
  const [work, setWork] = useState(profile.work);
  const [education, setEducation] = useState(profile.education);
  const router = useRouter();
  const { update } = useSession();

  const handleUpload = async (
    action: (fd: FormData) => Promise<{ ok: boolean; url: string }>,
    fd: FormData,
  ) => {
    try {
      const res = await action(fd);
      if (!res.ok) throw new Error("ACTION_FAILED");
      return res.url;
    } catch (e) {
      toast({ title: getFriendlyError(e, tCommon), variant: "danger" });
      return null;
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-in-up">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {/* ─── Personal Information ─── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("sections.personal")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={(fd) => {
              startTransition(async () => {
                try {
                  await updateProfileAction(fd);
                  toast({ title: t("saved"), variant: "success" });
                  router.refresh();
                } catch (e) {
                  toast({ title: getFriendlyError(e, tCommon), variant: "danger" });
                }
              });
            }}
            className="space-y-3"
          >
            <Input name="displayName" label={t("displayName")} defaultValue={profile.displayName} required leftIcon={<User className="h-4 w-4" />} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="username" label={t("username")} defaultValue={profile.username} disabled leftIcon={<User className="h-4 w-4" />} />
              <Input name="email" label={t("email")} defaultValue={profile.email} disabled leftIcon={<Mail className="h-4 w-4" />} />
            </div>
            <Input name="phone" label={t("phone")} defaultValue={profile.phone} leftIcon={<Phone className="h-4 w-4" />} />
            <Textarea name="bio" label={t("bio")} defaultValue={profile.bio} />
            <Button type="submit" loading={pending}>
              {t("saveProfile")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ─── Profile (avatar & cover) ─── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("sections.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar
            src={avatarPreview ?? profile.avatarUrl ?? undefined}
            fallback={profile.displayName.charAt(0) || "U"}
            size="xl"
            className="h-20 w-20"
          />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-xl border px-3 py-2 text-sm transition hover:bg-muted">
                {t("uploadAvatar")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.set("file", file);
                    startTransition(async () => {
                      const url = await handleUpload(uploadAvatarAction, fd);
                      if (url) {
                        setAvatarPreview(url);
                        await update();
                        toast({ title: t("saved"), variant: "success" });
                        router.refresh();
                      }
                    });
                  }}
                />
              </label>
              <label className="inline-flex cursor-pointer items-center rounded-xl border px-3 py-2 text-sm transition hover:bg-muted">
                {t("uploadCover")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.set("file", file);
                    startTransition(async () => {
                      const url = await handleUpload(uploadCoverAction, fd);
                      if (url) {
                        toast({ title: t("saved"), variant: "success" });
                        router.refresh();
                      }
                    });
                  }}
                />
              </label>
            </div>
            <VerificationBadge verified={profile.verificationStatus === "verified"} />
          </div>
        </CardContent>
      </Card>

      {/* ─── Preferences ─── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("sections.preferences")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">{t("sections.language")}</p>
            <LanguageSwitcher variant="full" />
          </div>

          <form
            action={(fd) => {
              fd.set("locale", locale);
              fd.set("country", country);
              fd.set("city", city);
              fd.set("languages", joinList(languages));
              fd.set("hobbies", joinList(hobbies));
              fd.set("work", work);
              fd.set("education", education);
              startTransition(async () => {
                try {
                  await updatePreferencesAction(fd);
                  await updateProfileAction(fd);
                  toast({ title: t("saved"), variant: "success" });
                  router.refresh();
                } catch (e) {
                  toast({ title: getFriendlyError(e, tCommon), variant: "danger" });
                }
              });
            }}
            className="space-y-4"
          >
            <input type="hidden" name="displayName" value={profile.displayName} />
            <input type="hidden" name="bio" value={profile.bio} />
            <input type="hidden" name="website" value={profile.website} />
            <input type="hidden" name="contactEmail" value={profile.contactEmail} />
            <input type="hidden" name="contactPhone" value={profile.contactPhone} />
            <div>
              <p className="mb-2 text-sm font-medium">{t("sections.appearance")}</p>
              <div className="flex flex-wrap items-center gap-4">
                <select
                  name="theme"
                  defaultValue={profile.theme}
                  className="h-11 w-40 rounded-xl border border-input bg-card px-3 text-sm"
                >
                  <option value="system">{t("themeSystem")}</option>
                  <option value="light">{t("themeLight")}</option>
                  <option value="dark">{t("themeDark")}</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="notificationsOn"
                    defaultChecked={profile.notificationsOn}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  />
                  {t("sections.notifications")}
                </label>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">{t("location")}</p>
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
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">{t("languages")}</p>
              <MultiSelectCombobox
                label=""
                name="languages"
                options={LANGUAGE_SUGGESTIONS}
                values={languages}
                onChange={setLanguages}
                placeholder={t("languagesPlaceholder")}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AutocompleteInput
                label={t("work")}
                name="work"
                options={OCCUPATION_SUGGESTIONS}
                value={work}
                onChange={setWork}
                placeholder={t("workPlaceholder")}
                allowCustom
              />
              <AutocompleteInput
                label={t("education")}
                name="education"
                options={EDUCATION_SUGGESTIONS}
                value={education}
                onChange={setEducation}
                placeholder={t("educationPlaceholder")}
                allowCustom
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">{t("hobbies")}</p>
              <MultiSelectCombobox
                label=""
                name="hobbies"
                options={HOBBY_SUGGESTIONS}
                values={hobbies}
                onChange={setHobbies}
                placeholder={t("hobbiesPlaceholder")}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="website" label={t("website")} defaultValue={profile.website} />
              <Input name="contactEmail" label={t("contactEmail")} defaultValue={profile.contactEmail} />
              <Input name="contactPhone" label={t("contactPhone")} defaultValue={profile.contactPhone} />
            </div>

            <Button type="submit" loading={pending}>
              {t("savePreferences")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ─── Security ─── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("sections.security")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={(fd) => {
              startTransition(async () => {
                try {
                  const newPassword = String(fd.get("newPassword") ?? "");
                  const confirm = String(fd.get("confirmPassword") ?? "");
                  if (newPassword !== confirm) {
                    toast({
                      title: tCommon("errors.PASSWORD_MISMATCH", {
                        defaultValue: tCommon("errors.generic"),
                      }),
                      variant: "danger",
                    });
                    return;
                  }
                  await changePasswordAction(fd);
                  toast({ title: t("passwordChanged"), variant: "success" });
                } catch (e) {
                  toast({ title: getFriendlyError(e, tCommon), variant: "danger" });
                }
              });
            }}
            className="space-y-3"
          >
            <PasswordInput name="currentPassword" label={t("currentPassword")} required />
            <PasswordInput name="newPassword" label={t("newPassword")} required minLength={8} />
            <PasswordInput name="confirmPassword" label={t("confirmPassword")} required minLength={8} />
            <Button type="submit" loading={pending} variant="outline">
              {t("updatePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <form action={logoutAction}>
        <Button type="submit" variant="danger" fullWidth>
          {tNav("logout")}
        </Button>
      </form>
    </div>
  );
}
