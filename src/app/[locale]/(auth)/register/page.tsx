import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { auth } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("register") };
}

export default async function RegisterPage({
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
      title={t("createAccount")}
      subtitle={t("registerSubtitle")}
      footer={
        <>
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            {t("loginCta")}
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
