import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { RequestForm } from "@/components/marketplace/request-form";

export default async function NewRequestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?callbackUrl=/${locale}/requests/new`);
  const t = await getTranslations("marketplace");
  const categories = await db.category.findMany({
    where: { kind: { in: ["request", "both", "service"] } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-xl animate-in-up">
      <h1 className="mb-4 text-2xl font-bold">{t("createRequest")}</h1>
      <RequestForm
        categories={categories.map((c) => ({
          id: c.id,
          label: locale === "ar" ? c.nameAr : c.nameNl,
        }))}
      />
    </div>
  );
}
