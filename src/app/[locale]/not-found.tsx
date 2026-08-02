import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FileQuestion } from "lucide-react";

export default async function NotFound() {
  const t = await getTranslations("states.notFound");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {t("description")}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
      >
        {t("home")}
      </Link>
    </div>
  );
}
