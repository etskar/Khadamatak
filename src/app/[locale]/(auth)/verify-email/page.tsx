import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { verifyEmailAction } from "@/server/actions/auth-actions";
import { Link } from "@/i18n/navigation";

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  let ok = false;
  let error = "";
  if (token) {
    const res = await verifyEmailAction(token);
    ok = res.ok;
    error = res.error ?? "";
  }

  return (
    <AuthShell
      title={t("verifyEmailTitle")}
      subtitle={ok ? t("verifyEmailSuccess") : t("verifyEmailFailed")}
      footer={
        <Link href="/login" className="font-semibold text-brand-700">
          {t("backToLogin")}
        </Link>
      }
    >
      <p className="text-center text-sm text-muted-foreground">
        {ok ? t("verifyEmailSuccess") : error || t("errors.TOKEN_INVALID")}
      </p>
    </AuthShell>
  );
}
