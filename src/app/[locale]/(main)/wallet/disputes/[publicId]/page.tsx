import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DisputePage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) notFound();

  const dispute = await db.dispute.findUnique({
    where: { publicId },
    include: {
      escrow: true,
      events: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
      evidence: true,
    },
  });
  if (!dispute) notFound();
  if (
    dispute.escrow.buyerId !== session.user.id &&
    dispute.escrow.sellerId !== session.user.id &&
    session.user.role !== "admin" &&
    session.user.role !== "super_admin"
  ) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-in-up">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{dispute.publicId}</CardTitle>
          <Badge>{dispute.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{dispute.reason}</p>
          {dispute.resolution ? (
            <p className="rounded-xl bg-muted p-3">{dispute.resolution}</p>
          ) : null}
          <p className="text-muted-foreground">
            Escrow: {dispute.escrow.publicId}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dispute.events.map((e) => (
            <div key={e.id} className="border-s-2 border-brand-500 ps-3">
              <p className="text-sm font-semibold">{e.type}</p>
              <p className="text-xs text-muted-foreground">{e.message}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
