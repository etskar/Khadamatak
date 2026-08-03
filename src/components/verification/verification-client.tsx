"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, Lock, EyeOff, BadgeCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  sendPhoneOtpAction,
  submitVerificationAction,
  verifyPhoneOtpAction,
} from "@/server/actions/profile-actions";
import { toast } from "@/components/ui/toast";
import { getFriendlyError } from "@/lib/friendly-errors";
import { useRouter } from "@/i18n/navigation";

type Props = {
  status: string;
  rejectionReason?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  phone: string;
  fullName: string;
};

export function VerificationClient(props: Props) {
  const t = useTranslations("verification");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState(props.phone);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-in-up">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <Card className="border-brand-200 bg-brand-50/40 dark:bg-brand-950/20">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-700" />
            <p className="font-semibold">{t("whyTitle")}</p>
            <Badge className="ms-auto">{props.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t("whyBody")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [Lock, t("secure")],
              [EyeOff, t("private")],
              [BadgeCheck, t("protected")],
            ].map(([Icon, label]) => (
              <div
                key={String(label)}
                className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-xs font-medium"
              >
                {/* @ts-expect-error icon */}
                <Icon className="h-4 w-4 text-brand-600" />
                {label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {props.status === "rejected" && props.rejectionReason ? (
        <Card className="border-danger/30 bg-[var(--danger-soft)]/40">
          <CardContent className="p-4 text-sm text-danger">
            {t("rejected")}: {props.rejectionReason}
          </CardContent>
        </Card>
      ) : null}

      {props.status === "verified" ? (
        <Card>
          <CardContent className="p-6 text-center">
            <BadgeCheck className="mx-auto h-12 w-12 text-success" />
            <p className="mt-3 text-lg font-semibold">{t("verifiedTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("verifiedBody")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="space-y-3 p-5">
            <h3 className="font-semibold">{t("emailStep")}</h3>
            <p className="text-sm text-muted-foreground">
              {props.emailVerified ? t("emailDone") : t("emailPending")}
            </p>
            {!props.emailVerified ? (
              <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
            ) : null}
          </Card>

          <Card className="space-y-3 p-5">
            <h3 className="font-semibold">{t("phoneStep")}</h3>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              label={t("phone")}
              disabled={props.phoneVerified}
            />
            {!props.phoneVerified ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  loading={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const fd = new FormData();
                      fd.set("phone", phone);
                      const res = await sendPhoneOtpAction(fd);
                      setDevOtp(res.devCode);
                      toast({ title: t("otpSent"), variant: "success" });
                    })
                  }
                >
                  {t("sendOtp")}
                </Button>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  containerClassName="flex-1 min-w-[8rem]"
                />
                <Button
                  type="button"
                  loading={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const fd = new FormData();
                      fd.set("phone", phone);
                      fd.set("code", otp);
                      await verifyPhoneOtpAction(fd);
                      toast({ title: t("phoneVerified"), variant: "success" });
                      router.refresh();
                    })
                  }
                >
                  {t("verifyOtp")}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-success">{t("phoneDone")}</p>
            )}
            {devOtp ? (
              <p className="text-xs text-muted-foreground">Dev OTP: {devOtp}</p>
            ) : null}
          </Card>

          <Card className="p-5">
            <form
              action={(fd) => {
                startTransition(async () => {
                  try {
                    await submitVerificationAction(fd);
                    toast({ title: t("submitted"), variant: "success" });
                    router.refresh();
                  } catch (e) {
                    toast({
                      title: getFriendlyError(e, tCommon),
                      variant: "danger",
                    });
                  }
                });
              }}
              className="space-y-3"
            >
              <h3 className="font-semibold">{t("identityStep")}</h3>
              <Input
                name="fullName"
                label={t("fullName")}
                defaultValue={props.fullName}
                required
              />
              <Input name="addressLine1" label={t("address1")} required />
              <Input name="addressLine2" label={t("address2")} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Input name="city" label={t("city")} required />
                <Input name="postalCode" label={t("postal")} required />
                <Input name="country" label={t("country")} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("idUpload")}
                </label>
                <input
                  type="file"
                  name="governmentId"
                  accept="image/*,application/pdf"
                  required
                  className="block w-full text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("selfieUpload")}
                </label>
                <input
                  type="file"
                  name="selfie"
                  accept="image/*"
                  className="block w-full text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">{t("selfieHint")}</p>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="termsAccepted" className="mt-1" required />
                <span>{t("terms")}</span>
              </label>
              <Button
                type="submit"
                fullWidth
                loading={pending}
                disabled={!props.emailVerified || !props.phoneVerified}
              >
                {t("submit")}
              </Button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}

