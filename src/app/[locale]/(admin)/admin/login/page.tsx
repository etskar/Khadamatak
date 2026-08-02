import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { redirect } from "@/i18n/navigation";
import { getAdminSessionContextOrNull } from "@/server/admin/guard";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Logo } from "@/components/shared/logo";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await getAdminSessionContextOrNull();
  if (ctx) redirect({ href: "/admin", locale });

  const t = await getTranslations("admin");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size="md" />
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-800/40 dark:text-brand-200">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("login.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("login.subtitle")}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
