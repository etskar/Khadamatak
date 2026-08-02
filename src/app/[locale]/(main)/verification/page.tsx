import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { VerificationClient } from "@/components/verification/verification-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "verification" });
  return { title: t("title") };
}

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/verification`);
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { verification: true },
  });
  if (!user) redirect(`/${locale}`);

  return (
    <VerificationClient
      status={user.verification?.status ?? "not_started"}
      rejectionReason={user.verification?.rejectionReason}
      emailVerified={Boolean(user.emailVerified)}
      phoneVerified={Boolean(user.phoneVerifiedAt)}
      phone={user.phone ?? ""}
      fullName={user.realName ?? user.verification?.fullName ?? ""}
    />
  );
}
