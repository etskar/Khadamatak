"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { payRequestAction } from "@/server/actions/wallet-actions";
import { toast } from "@/components/ui/toast";
import { Link } from "@/i18n/navigation";

type Props = {
  shareToken: string;
  description: string;
  amountLabel: string;
  status: string;
  fromName: string;
  fromAvatar?: string | null;
  isAuthenticated: boolean;
  isOwn: boolean;
  labels: {
    title: string;
    payNow: string;
    login: string;
    paid: string;
    expired: string;
    own: string;
    paymentSuccess: string;
  };
};

export function PayRequestClient(props: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const tCommon = useTranslations("common");

  return (
    <Card className="overflow-hidden shadow-lg">
      <div className="bg-gradient-to-br from-brand-500 to-brand-800 px-5 py-8 text-white">
        <p className="text-sm opacity-90">{props.labels.title}</p>
        <p className="mt-2 text-3xl font-bold">{props.amountLabel}</p>
      </div>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar src={props.fromAvatar} fallback={props.fromName} size="lg" />
          <div>
            <p className="font-semibold">{props.fromName}</p>
            <p className="text-sm text-muted-foreground">{props.description}</p>
          </div>
        </div>

        {props.status === "paid" ? (
          <p className="rounded-xl bg-[var(--success-soft)] px-3 py-2 text-sm text-success">
            {props.labels.paid}
          </p>
        ) : props.status === "expired" ? (
          <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm text-danger">
            {props.labels.expired}
          </p>
        ) : props.isOwn ? (
          <p className="text-sm text-muted-foreground">{props.labels.own}</p>
        ) : !props.isAuthenticated ? (
          <Link
            href="/login"
            className="flex h-12 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground"
          >
            {props.labels.login}
          </Link>
        ) : (
          <Button
            fullWidth
            size="lg"
            loading={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  const fd = new FormData();
                  fd.set("shareToken", props.shareToken);
                  await payRequestAction(fd);
                  toast({ title: props.labels.paymentSuccess, variant: "success" });
                  router.push("/wallet");
                  router.refresh();
                } catch (e) {
                  toast({
                    title: e instanceof Error ? e.message : tCommon("error"),
                    variant: "danger",
                  });
                }
              });
            }}
          >
            {props.labels.payNow}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
