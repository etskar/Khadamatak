"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  createProductAction,
  createServiceAction,
} from "@/server/actions/marketplace-actions";
import { toast } from "@/components/ui/toast";

export function ListingForm({
  kind,
  categories,
}: {
  kind: "product" | "service";
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
                if (kind === "product") {
                  const res = await createProductAction(fd);
                  router.push(`/products/${res.publicId}`);
                } else {
                  const res = await createServiceAction(fd);
                  router.push(`/services/${res.publicId}`);
                }
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
          {kind === "product" ? (
            <>
              <Input name="price" type="number" step="0.01" label={t("price")} required />
              <select
                name="condition"
                className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
                defaultValue="used"
              >
                <option value="new">new</option>
                <option value="like_new">like_new</option>
                <option value="used">used</option>
                <option value="for_parts">for_parts</option>
              </select>
            </>
          ) : (
            <>
              <select
                name="pricingType"
                className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
                defaultValue="fixed"
              >
                <option value="fixed">fixed</option>
                <option value="hourly">hourly</option>
                <option value="quote">quote</option>
              </select>
              <Input name="price" type="number" step="0.01" label={t("price")} />
              <Input name="availability" label={t("availability")} />
              <Input name="workingHours" label={t("workingHours")} />
            </>
          )}
          <Input name="city" label={t("city")} />
          <Input name="country" label={t("country")} defaultValue="NL" />
          <Input name="addressLine" label={t("address")} />
          <div className="grid grid-cols-2 gap-2">
            <Input name="latitude" type="number" step="any" label="Lat" />
            <Input name="longitude" type="number" step="any" label="Lng" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("media")}</label>
            <input type="file" name="media" multiple accept="image/*,video/mp4" />
          </div>
          <Button type="submit" fullWidth loading={pending}>
            {t("publish")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
