import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { googleConfigured } from "@/lib/auth";
import { auth } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("login") };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  const session = await auth();
  if (session?.user?.id) {
    redirect(`/${locale}`);
  }

  return (
    <AuthShell
      title={t("welcomeBack")}
      subtitle={t("loginSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link
            href="/register"
            className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            {t("registerCta")}
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm googleEnabled={googleConfigured} />
      </Suspense>
    </AuthShell>
  );
}
