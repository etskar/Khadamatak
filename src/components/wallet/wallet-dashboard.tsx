"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  QrCode,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import {
  createEscrowAction,
  createPaymentRequestAction,
  getWalletQrAction,
  lookupRecipientAction,
  setPinAction,
  topUpWalletAction,
  transferAction,
} from "@/server/actions/wallet-actions";
import { Link } from "@/i18n/navigation";

type Tx = {
  id: string;
  reference: string;
  type: string;
  status: string;
  amountCents: number;
  currency: string;
  createdAt: string | Date;
  notes: string | null;
};

type EscrowItem = {
  id: string;
  publicId: string;
  status: string;
  amountCents: number;
  description: string | null;
  buyerId: string;
  sellerId: string;
};

type WalletDashboardProps = {
  wallet: {
    walletId: string;
    walletUsername: string;
    availableCents: number;
    pendingCents: number;
    frozenCents: number;
    currency: string;
    status: string;
    hasPin: boolean;
  };
  transactions: Tx[];
  escrows: EscrowItem[];
  verified: boolean;
  userId: string;
};

export function WalletDashboard({
  wallet,
  transactions,
  escrows,
  verified,
  userId,
}: WalletDashboardProps) {
  const t = useTranslations("wallet");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [tab, setTab] = useState<"topup" | "send" | "request" | "escrow" | "security">(
    "topup",
  );
  const [pending, startTransition] = useTransition();
  const [recipient, setRecipient] = useState<{
    walletId: string;
    displayName: string;
    avatarUrl: string | null;
  } | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: t("copied"), variant: "success" });
  };

  const onLookup = (query: string) => {
    startTransition(async () => {
      const res = await lookupRecipientAction(query);
      if (res.ok) setRecipient(res.recipient);
      else {
        setRecipient(null);
        toast({ title: t("recipientNotFound"), variant: "warning" });
      }
    });
  };

  return (
    <div className="space-y-5 animate-in-up">
      {!verified ? (
        <Card className="border-warning/40 bg-[var(--warning-soft)]/40">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-warning" />
              <div>
                <p className="font-semibold">{t("verifyRequiredTitle")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("verifyRequiredBody")}
                </p>
              </div>
            </div>
            <Link
              href="/verification"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              {t("verifyNow")}
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <BalanceCard
          label={t("available")}
          cents={wallet.availableCents}
          currency={wallet.currency}
          locale={locale}
          accent
        />
        <BalanceCard
          label={t("pending")}
          cents={wallet.pendingCents}
          currency={wallet.currency}
          locale={locale}
        />
        <BalanceCard
          label={t("frozen")}
          cents={wallet.frozenCents}
          currency={wallet.currency}
          locale={locale}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-brand-600" />
              {wallet.walletId}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              @{wallet.walletUsername}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => copy(wallet.walletId)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() =>
                startTransition(async () => {
                  const res = await getWalletQrAction();
                  setQr(res.dataUrl);
                })
              }
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        {qr ? (
          <CardContent className="flex justify-center pb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Wallet QR" className="h-48 w-48 rounded-2xl border" />
          </CardContent>
        ) : null}
      </Card>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(
          [
            ["topup", t("topUp")],
            ["send", t("send")],
            ["request", t("request")],
            ["escrow", t("escrow")],
            ["security", t("security")],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          {tab === "topup" ? (
            <form
              action={(fd) => {
                fd.set("locale", locale);
                startTransition(async () => {
                  try {
                    const res = await topUpWalletAction(fd);
                    if (res.checkoutUrl) {
                      window.location.href = res.checkoutUrl;
                    } else {
                      toast({ title: t("topUpSuccess"), variant: "success" });
                      window.location.reload();
                    }
                  } catch (e) {
                    toast({
                      title: e instanceof Error ? e.message : tCommon("error"),
                      variant: "danger",
                    });
                  }
                });
              }}
              className="space-y-3"
            >
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="1"
                label={t("amount")}
                placeholder="25.00"
                required
              />
              <p className="text-xs text-muted-foreground">{t("idealHint")}</p>
              <Button type="submit" loading={pending} fullWidth>
                <ArrowDownLeft className="h-4 w-4" />
                {t("payIdeal")}
              </Button>
            </form>
          ) : null}

          {tab === "send" ? (
            <form
              action={(fd) => {
                startTransition(async () => {
                  try {
                    const res = await transferAction(fd);
                    toast({
                      title: t("transferSuccess"),
                      description: res.reference,
                      variant: "success",
                    });
                    window.location.reload();
                  } catch (e) {
                    toast({
                      title: e instanceof Error ? e.message : tCommon("error"),
                      variant: "danger",
                    });
                  }
                });
              }}
              className="space-y-3"
            >
              <Input
                name="to"
                label={t("recipient")}
                placeholder={t("recipientPlaceholder")}
                required
                onBlur={(e) => {
                  if (e.target.value.trim()) onLookup(e.target.value.trim());
                }}
              />
              {recipient ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
                  <Avatar
                    src={recipient.avatarUrl}
                    fallback={recipient.displayName}
                    size="md"
                  />
                  <div>
                    <p className="font-semibold">{recipient.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {recipient.walletId}
                    </p>
                  </div>
                </div>
              ) : null}
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                label={t("amount")}
                required
              />
              <Input name="notes" label={t("notes")} />
              {wallet.hasPin ? (
                <Input name="pin" type="password" inputMode="numeric" label={t("pin")} />
              ) : null}
              <Button type="submit" loading={pending} fullWidth disabled={!verified}>
                <ArrowUpRight className="h-4 w-4" />
                {t("confirmTransfer")}
              </Button>
            </form>
          ) : null}

          {tab === "request" ? (
            <form
              action={(fd) => {
                startTransition(async () => {
                  try {
                    const res = await createPaymentRequestAction(fd);
                    const url = `${window.location.origin}/${locale}${res.payPath}`;
                    await navigator.clipboard.writeText(url);
                    toast({
                      title: t("requestCreated"),
                      description: t("linkCopied"),
                      variant: "success",
                    });
                  } catch (e) {
                    toast({
                      title: e instanceof Error ? e.message : tCommon("error"),
                      variant: "danger",
                    });
                  }
                });
              }}
              className="space-y-3"
            >
              <Input name="amount" type="number" step="0.01" label={t("amount")} required />
              <Input name="description" label={t("description")} required />
              <Button type="submit" loading={pending} fullWidth disabled={!verified}>
                {t("createRequest")}
              </Button>
            </form>
          ) : null}

          {tab === "escrow" ? (
            <form
              action={(fd) => {
                startTransition(async () => {
                  try {
                    const res = await createEscrowAction(fd);
                    toast({
                      title: t("escrowCreated"),
                      description: res.publicId,
                      variant: "success",
                    });
                    window.location.reload();
                  } catch (e) {
                    toast({
                      title: e instanceof Error ? e.message : tCommon("error"),
                      variant: "danger",
                    });
                  }
                });
              }}
              className="space-y-3"
            >
              <p className="text-sm text-muted-foreground">{t("escrowHint")}</p>
              <Input
                name="seller"
                label={t("seller")}
                placeholder={t("recipientPlaceholder")}
                required
              />
              <Input name="amount" type="number" step="0.01" label={t("amount")} required />
              <Input name="description" label={t("description")} />
              <Button type="submit" loading={pending} fullWidth disabled={!verified}>
                {t("lockInEscrow")}
              </Button>
            </form>
          ) : null}

          {tab === "security" ? (
            <form
              action={(fd) => {
                startTransition(async () => {
                  try {
                    await setPinAction(fd);
                    toast({ title: t("pinSet"), variant: "success" });
                  } catch (e) {
                    toast({
                      title: e instanceof Error ? e.message : tCommon("error"),
                      variant: "danger",
                    });
                  }
                });
              }}
              className="space-y-3"
            >
              <Input
                name="pin"
                type="password"
                inputMode="numeric"
                label={t("setPin")}
                placeholder="••••"
                minLength={4}
                maxLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">{t("securityHint")}</p>
              <Button type="submit" loading={pending} fullWidth>
                {t("savePin")}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {escrows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("activeEscrows")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {escrows.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
              >
                <div>
                  <p className="font-semibold">{e.publicId}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.description || e.status} ·{" "}
                    {formatMoney(e.amountCents, wallet.currency, locale === "ar" ? "ar" : "nl-NL")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{e.status}</Badge>
                  <Link
                    href={`/wallet/escrow/${e.publicId}`}
                    className="text-sm font-semibold text-brand-700"
                  >
                    {t("open")}
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("transactions")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noTransactions")}</p>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{tx.reference}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.type} · {tx.status}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold tabular-nums">
                  {formatMoney(tx.amountCents, tx.currency, locale === "ar" ? "ar" : "nl-NL")}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <p className="hidden">{userId}</p>
    </div>
  );
}

function BalanceCard({
  label,
  cents,
  currency,
  locale,
  accent,
}: {
  label: string;
  cents: number;
  currency: string;
  locale: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-brand-200 bg-brand-50/50 dark:bg-brand-950/20" : ""}>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold tabular-nums">
          {formatMoney(cents, currency, locale === "ar" ? "ar" : "nl-NL")}
        </p>
      </CardContent>
    </Card>
  );
}
