"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createJobAction } from "@/server/actions/marketplace-actions";
import { toast } from "@/components/ui/toast";

export function JobPublishForm({
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
                const res = await createJobAction(fd);
                router.push(`/jobs/${res.publicId}`);
              } catch (err) {
                toast({
                  title: err instanceof Error ? err.message : tCommon("error"),
                  variant: "danger",
                });
              }
            });
          }}
        >
          <Input name="title" label={t("jobTitle")} required />
          <Input name="company" label={t("company")} required />
          <Textarea name="description" label={t("description")} required />
          <Textarea name="requirements" label={t("requirements")} />
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
          <div className="grid grid-cols-2 gap-2">
            <Input name="salaryMin" type="number" step="0.01" label={t("salaryMin")} />
            <Input name="salaryMax" type="number" step="0.01" label={t("salaryMax")} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              name="salaryPeriod"
              className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
              defaultValue="monthly"
            >
              <option value="hourly">hourly</option>
              <option value="monthly">monthly</option>
              <option value="yearly">yearly</option>
              <option value="project">project</option>
            </select>
            <select
              name="employmentType"
              className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
              defaultValue="full_time"
            >
              <option value="full_time">full_time</option>
              <option value="part_time">part_time</option>
              <option value="contract">contract</option>
              <option value="freelance">freelance</option>
              <option value="internship">internship</option>
            </select>
          </div>
          <Input name="workHours" label={t("workHours")} placeholder="Mon-Fri, 9-17" />
          <div className="grid grid-cols-3 gap-2">
            <select
              name="applyMethod"
              className="h-12 w-full rounded-xl border border-input bg-card px-3 text-sm"
              defaultValue="message"
            >
              <option value="message">message</option>
              <option value="email">email</option>
              <option value="external">external</option>
            </select>
            <Input name="applyEmail" label={t("applyEmail")} className="col-span-2" />
          </div>
          <Input name="applyUrl" label={t("applyUrl")} placeholder="https://…" />
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
