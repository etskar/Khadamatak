import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProfileByUserId } from "@/server/users/profile-service";
import { SettingsClient } from "@/components/settings/settings-client";
import { logoutAction } from "@/server/actions/auth-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return { title: t("title") };
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/settings`);
  }

  const profile = await getProfileByUserId(session.user.id);
  if (!profile) redirect(`/${locale}`);

  return (
    <SettingsClient
      locale={locale}
      profile={{
        displayName: profile.displayName,
        username: profile.username,
        email: profile.user.email,
        phone: profile.user.phone ?? "",
        bio: profile.bio ?? "",
        avatarUrl: profile.avatarUrl,
        coverUrl: profile.coverUrl,
        country: profile.country ?? "NL",
        city: profile.city ?? "",
        work: profile.work ?? "",
        education: profile.education ?? "",
        hobbies: profile.hobbies ?? "",
        languages: profile.languages ?? "",
        website: profile.website ?? "",
        contactEmail: profile.contactEmail ?? "",
        contactPhone: profile.contactPhone ?? "",
        theme: profile.user.theme,
        notificationsOn: profile.user.notificationsOn,
        verificationStatus: profile.user.verification?.status ?? "not_started",
      }}
      logoutAction={logoutAction.bind(null, locale)}
    />
  );
}
