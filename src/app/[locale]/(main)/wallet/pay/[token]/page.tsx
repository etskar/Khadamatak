import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PayRequestClient } from "@/components/wallet/pay-request-client";
import { formatMoney } from "@/lib/money";

export default async function PayRequestPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("wallet");
  const session = await auth();

  const pr = await db.paymentRequest.findUnique({
    where: { shareToken: token },
    include: {
      fromUser: {
        include: { profile: true },
      },
    },
  });
  if (!pr) notFound();

  return (
    <div className="mx-auto max-w-md animate-in-up">
      <PayRequestClient
        shareToken={token}
        description={pr.description}
        amountLabel={formatMoney(pr.amountCents, pr.currency, locale === "ar" ? "ar" : "nl-NL")}
        status={pr.status}
        fromName={pr.fromUser.profile?.displayName ?? "User"}
        fromAvatar={pr.fromUser.profile?.avatarUrl}
        isAuthenticated={Boolean(session?.user)}
        isOwn={session?.user?.id === pr.fromUserId}
        labels={{
          title: t("paymentRequest"),
          payNow: t("payNow"),
          login: t("loginToPay"),
          paid: t("alreadyPaid"),
          expired: t("expired"),
          own: t("ownRequest"),
          paymentSuccess: t("paymentSuccess"),
        }}
      />
    </div>
  );
}
