"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import {
  changePasswordAction,
  updatePreferencesAction,
  updateProfileAction,
  uploadAvatarAction,
  uploadCoverAction,
} from "@/server/actions/profile-actions";
import { toast } from "@/components/ui/toast";
import { getFriendlyError } from "@/lib/friendly-errors";
import { useState } from "react";

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
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const [pending, startTransition] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const router = useRouter();
  const { update } = useSession();

  const handleUpload = async (action: (fd: FormData) => Promise<{ ok: boolean; url: string }>, fd: FormData) => {
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

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">{t("sections.language")}</h2>
        <p className="text-xs text-muted-foreground">{t("languageDescription")}</p>
        <LanguageSwitcher variant="full" />
        <form
          action={(fd) => {
            fd.set("locale", locale);
            startTransition(async () => {
              try {
                await updatePreferencesAction(fd);
                toast({ title: t("saved"), variant: "success" });
                router.refresh();
              } catch (e) {
                toast({ title: getFriendlyError(e, tCommon), variant: "danger" });
              }
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
        <div className="flex items-center gap-4">
          <Avatar src={avatarPreview ?? undefined} fallback={profile.displayName.charAt(0) || "U"} size="lg" />
          <div className="flex flex-wrap gap-2">
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
        </div>

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
                const newPassword = String(fd.get("newPassword") ?? "");
                const confirm = String(fd.get("confirmPassword") ?? "");
                if (newPassword !== confirm) {
                  toast({ title: tCommon("errors.PASSWORD_MISMATCH", { defaultValue: tCommon("errors.generic") }), variant: "danger" });
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

