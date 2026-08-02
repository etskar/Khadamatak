"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createRequestAction } from "@/server/actions/marketplace-actions";
import { toast } from "@/components/ui/toast";

export function RequestForm({
  categories,
}: {
  categories: { id: string; label: string }[];
}) {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Card>
      <CardContent className="p-5">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                const res = await createRequestAction(fd);
                toast({ title: tCommon("success"), variant: "success" });
                router.push(`/requests/${res.publicId}`);
              } catch (err) {
                toast({
                  title: err instanceof Error ? err.message : tCommon("error"),
                  variant: "danger",
                });
              }
            });
          }}
        >
          <Input name="title" label={t("title")} required />
          <Textarea name="description" label={t("description")} required />
          <select
            name="categoryId"
            className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
          >
            <option value="">{t("allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <Input name="startLocation" label={t("from")} />
          <Input name="destination" label={t("to")} />
          <Input name="budget" type="number" step="0.01" label={t("budget")} />
          <Input name="neededAt" type="datetime-local" label={t("neededAt")} />
          <Button type="submit" fullWidth loading={pending}>
            {t("publish")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
