"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmDeliveryAction,
  markDeliveredAction,
  openDisputeAction,
} from "@/server/actions/wallet-actions";
import { toast } from "@/components/ui/toast";
import { Link } from "@/i18n/navigation";

type Props = {
  publicId: string;
  status: string;
  amountLabel: string;
  description: string | null;
  isBuyer: boolean;
  isSeller: boolean;
  buyerName: string;
  sellerName: string;
  events: { id: string; type: string; message: string | null; createdAt: string }[];
  disputePublicId: string | null;
  labels: {
    title: string;
    markDelivered: string;
    confirmDelivery: string;
    openDispute: string;
    timeline: string;
    deliveredSuccess: string;
    confirmedSuccess: string;
    disputeLabel: string;
  };
};

export function EscrowDetailClient(props: Props) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-in-up">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>
              {props.labels.title} · {props.publicId}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {props.buyerName} → {props.sellerName}
            </p>
          </div>
          <Badge>{props.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-2xl font-bold">{props.amountLabel}</p>
          {props.description ? (
            <p className="text-sm text-muted-foreground">{props.description}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {props.isSeller && props.status === "funded" ? (
              <Button
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    await markDeliveredAction(props.publicId);
                    toast({ title: props.labels.deliveredSuccess, variant: "success" });
                    router.refresh();
                  })
                }
              >
                {props.labels.markDelivered}
              </Button>
            ) : null}

            {props.isBuyer &&
            (props.status === "funded" || props.status === "delivered") ? (
              <Button
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    await confirmDeliveryAction(props.publicId);
                    toast({ title: props.labels.confirmedSuccess, variant: "success" });
                    router.refresh();
                  })
                }
              >
                {props.labels.confirmDelivery}
              </Button>
            ) : null}
          </div>

          {(props.status === "funded" || props.status === "delivered") &&
          !props.disputePublicId ? (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={props.labels.openDispute}
              />
              <Button
                variant="danger"
                loading={pending}
                disabled={!reason.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const fd = new FormData();
                    fd.set("escrowPublicId", props.publicId);
                    fd.set("reason", reason);
                    const res = await openDisputeAction(fd);
                    router.push(`/wallet/disputes/${res.publicId}`);
                  })
                }
              >
                {props.labels.openDispute}
              </Button>
            </div>
          ) : null}

          {props.disputePublicId ? (
            <Link
              href={`/wallet/disputes/${props.disputePublicId}`}
              className="text-sm font-semibold text-brand-700"
            >
              {props.labels.disputeLabel}: {props.disputePublicId}
            </Link>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{props.labels.timeline}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {props.events.map((e) => (
            <div key={e.id} className="border-s-2 border-brand-500 ps-3">
              <p className="text-sm font-semibold">{e.type}</p>
              <p className="text-xs text-muted-foreground">{e.message}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(e.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
