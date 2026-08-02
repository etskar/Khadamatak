"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import {
  changePasswordAction,
  updatePreferencesAction,
  updateProfileAction,
  uploadAvatarAction,
  uploadCoverAction,
} from "@/server/actions/profile-actions";
import { toast } from "@/components/ui/toast";

type Props = {
  locale: string;
  profile: {
    displayName: string;
    bio: string;
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
  };
  logoutAction: () => Promise<void>;
};

export function SettingsClient({ locale, profile, logoutAction }: Props) {
  const t = useTranslations("settings");
  const tNav = useTranslations("nav");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-in-up">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">{t("sections.language")}</h2>
        <p className="text-xs text-muted-foreground">{t("languageDescription")}</p>
        <LanguageSwitcher variant="full" />
        <form
          action={(fd) => {
            fd.set("locale", locale);
            startTransition(async () => {
              await updatePreferencesAction(fd);
              toast({ title: t("saved"), variant: "success" });
              router.refresh();
            });
          }}
          className="space-y-3 border-t border-border pt-4"
        >
          <label className="block text-sm font-medium">{t("sections.appearance")}</label>
          <select
            name="theme"
            defaultValue={profile.theme}
            className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
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
            />
            {t("sections.notifications")}
          </label>
          <Button type="submit" loading={pending}>
            {t("savePreferences")}
          </Button>
        </form>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">{t("sections.account")}</h2>
        <div className="flex gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-xl border px-3 py-2 text-sm">
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
                  await uploadAvatarAction(fd);
                  toast({ title: t("saved"), variant: "success" });
                  router.refresh();
                });
              }}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center rounded-xl border px-3 py-2 text-sm">
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
                  await uploadCoverAction(fd);
                  toast({ title: t("saved"), variant: "success" });
                  router.refresh();
                });
              }}
            />
          </label>
        </div>

        <form
          action={(fd) => {
            startTransition(async () => {
              await updateProfileAction(fd);
              toast({ title: t("saved"), variant: "success" });
              router.refresh();
            });
          }}
          className="space-y-3"
        >
          <Input name="displayName" label={t("displayName")} defaultValue={profile.displayName} required />
          <Textarea name="bio" label={t("bio")} defaultValue={profile.bio} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="country" label={t("country")} defaultValue={profile.country} />
            <Input name="city" label={t("city")} defaultValue={profile.city} />
          </div>
          <Input name="work" label={t("work")} defaultValue={profile.work} />
          <Input name="education" label={t("education")} defaultValue={profile.education} />
          <Input name="hobbies" label={t("hobbies")} defaultValue={safeDisplay(profile.hobbies)} />
          <Input name="languages" label={t("languages")} defaultValue={safeDisplay(profile.languages)} />
          <Input name="website" label={t("website")} defaultValue={profile.website} />
          <Input name="contactEmail" label={t("contactEmail")} defaultValue={profile.contactEmail} />
          <Input name="contactPhone" label={t("contactPhone")} defaultValue={profile.contactPhone} />
          <Button type="submit" loading={pending}>
            {t("saveProfile")}
          </Button>
        </form>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">{t("sections.security")}</h2>
        <form
          action={(fd) => {
            startTransition(async () => {
              try {
                await changePasswordAction(fd);
                toast({ title: t("passwordChanged"), variant: "success" });
              } catch {
                toast({ title: t("passwordError"), variant: "danger" });
              }
            });
          }}
          className="space-y-3"
        >
          <Input name="currentPassword" type="password" label={t("currentPassword")} required />
          <Input name="newPassword" type="password" label={t("newPassword")} required minLength={8} />
          <Button type="submit" loading={pending} variant="outline">
            {t("updatePassword")}
          </Button>
        </form>
      </Card>

      <form action={logoutAction}>
        <Button type="submit" variant="danger" fullWidth>
          {tNav("logout")}
        </Button>
      </form>
    </div>
  );
}

function safeDisplay(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.join(", ");
  } catch {
    /* ignore */
  }
  return value;
}
