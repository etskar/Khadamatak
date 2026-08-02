import { getTranslations } from "next-intl/server";
import { ShieldX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export async function AccessDenied() {
  const t = await getTranslations("admin.accessDenied");
  return (
    <div className="mx-auto max-w-lg py-10">
      <EmptyState
        icon={ShieldX}
        title={t("title")}
        description={t("description")}
      />
    </div>
  );
}
