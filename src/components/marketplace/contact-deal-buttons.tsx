"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  contactSellerAction,
  createDealAction,
} from "@/server/actions/marketplace-actions";
import { toast } from "@/components/ui/toast";

export function ContactAndDealButtons({
  sellerId,
  productPublicId,
  servicePublicId,
  requestPublicId,
  defaultAmount,
  labels,
}: {
  sellerId: string;
  productPublicId?: string;
  servicePublicId?: string;
  requestPublicId?: string;
  defaultAmount?: string;
  labels: { contact: string; startDeal: string; termsPlaceholder?: string };
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const tCommon = useTranslations("common");

  return (
    <div className="space-y-2">
      <Button
        fullWidth
        variant="outline"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await contactSellerAction(sellerId);
            router.push(`/messages/${res.conversationId}`);
          })
        }
      >
        {labels.contact}
      </Button>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("sellerId", sellerId);
          if (productPublicId) fd.set("productPublicId", productPublicId);
          if (servicePublicId) fd.set("servicePublicId", servicePublicId);
          if (requestPublicId) fd.set("requestPublicId", requestPublicId);
          startTransition(async () => {
            try {
              const res = await createDealAction(fd);
              router.push(`/deals/${res.publicId}`);
            } catch (err) {
              toast({
                title: err instanceof Error ? err.message : tCommon("error"),
                variant: "danger",
              });
            }
          });
        }}
      >
        <Input
          name="amount"
          type="number"
          step="0.01"
          defaultValue={defaultAmount}
          required
        />
        <Input name="terms" placeholder={labels.termsPlaceholder} />
        <Button type="submit" fullWidth loading={pending}>
          {labels.startDeal}
        </Button>
      </form>
    </div>
  );
}
