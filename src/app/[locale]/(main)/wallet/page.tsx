import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { WalletDashboard } from "@/components/wallet/wallet-dashboard";
import { ensureWalletForUser } from "@/server/finance/wallet-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "wallet" });
  return { title: t("title") };
}

export default async function WalletPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("wallet");

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/wallet`);
  }

  const userId = session!.user!.id;
  let wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    const profile = await db.profile.findUnique({ where: { userId } });
    wallet = await ensureWalletForUser(userId, profile?.username ?? "user");
  }

  const [transactions, escrows, verification] = await Promise.all([
    db.financialTransaction.findMany({
      where: {
        OR: [
          { fromWalletId: wallet.id },
          { toWalletId: wallet.id },
          { actorUserId: userId },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.escrow.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        status: { in: ["funded", "delivered", "disputed", "created"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.identityVerification.findUnique({ where: { userId } }),
  ]);

  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <WalletDashboard
        wallet={{
          walletId: wallet.walletId,
          walletUsername: wallet.walletUsername,
          availableCents: wallet.availableCents,
          pendingCents: wallet.pendingCents,
          frozenCents: wallet.frozenCents,
          currency: wallet.currency,
          status: wallet.status,
          hasPin: Boolean(wallet.pinHash),
        }}
        transactions={transactions}
        escrows={escrows}
        verified={verification?.status === "verified"}
        userId={userId}
      />
    </div>
  );
}
