import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ensureCategories } from "@/server/marketplace/dashboard-service";
import { PublishWizard } from "@/components/marketplace/publish-wizard";

export default async function SellProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/sell/product`);
  }
  if (session.user.verificationStatus !== "verified") {
    redirect(`/${locale}/verification`);
  }
  await ensureCategories();
  const t = await getTranslations("marketplace");
  const categories = await db.category.findMany({
    where: { kind: { in: ["product", "both"] } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-xl animate-in-up">
      <h1 className="mb-4 text-2xl font-bold">{t("sellProduct")}</h1>
      <PublishWizard
        kind="product"
        categories={categories.map((c) => ({
          id: c.id,
          label: locale === "ar" ? c.nameAr : c.nameNl,
        }))}
      />
    </div>
  );
}
