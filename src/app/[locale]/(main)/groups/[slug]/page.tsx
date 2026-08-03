import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGroupBySlug } from "@/server/marketplace/group-service";
import { GroupDetailClient } from "@/components/marketplace/group-detail-client";
import { priceCentsLabel } from "@/components/marketplace/listing-card";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketplace");
  const session = await auth();
  const group = await getGroupBySlug(slug, session?.user?.id);
  if (!group) notFound();

  const products = group.products.map((p) => ({
    publicId: p.publicId,
    title: p.title,
    priceLabel: priceCentsLabel(
      p.priceCents,
      p.currency,
      locale === "ar" ? "ar" : "nl-NL",
    ),
    imageUrl: p.media[0]?.url ?? null,
    city: p.city,
  }));

  const services = group.services.map((s) => ({
    publicId: s.publicId,
    title: s.title,
    priceLabel: priceCentsLabel(
      s.priceCents,
      s.currency,
      locale === "ar" ? "ar" : "nl-NL",
      s.pricingType,
    ),
    imageUrl: s.media[0]?.url ?? null,
    city: s.city,
  }));

  const jobs = group.jobs.map((j) => ({
    publicId: j.publicId,
    title: j.title,
    company: j.company,
    city: j.city,
    employmentType: j.employmentType,
    salaryMinCents: j.salaryMinCents,
    salaryMaxCents: j.salaryMaxCents,
    currency: j.currency,
    salaryPeriod: j.salaryPeriod,
    imageUrl: j.media[0]?.url ?? null,
  }));

  return (
    <GroupDetailClient
      slug={group.slug}
      currentUserId={session?.user?.id ?? null}
      name={locale === "ar" ? group.nameAr || group.name : group.nameNl || group.name}
      city={group.city}
      description={group.description}
      memberStatus={group.membership?.status ?? null}
      requiresVerification={group.requiresVerification}
      members={group.members.map((m) => ({
        id: m.userId,
        name: m.user.profile?.displayName ?? "User",
        username: m.user.profile?.username ?? "",
        avatarUrl: m.user.profile?.avatarUrl,
        verified: m.user.verification?.status === "verified",
      }))}
      posts={group.groupPosts.map((p) => ({
        id: p.id,
        content: p.content,
        type: p.type,
        mediaJson: p.mediaJson,
        payloadJson: p.payloadJson,
        authorId: p.authorId,
        author: p.author.profile?.displayName ?? "User",
        authorUsername: p.author.profile?.username ?? "",
        authorAvatar: p.author.profile?.avatarUrl ?? null,
        createdAt: p.createdAt.toISOString(),
      }))}
      products={products}
      services={services}
      jobs={jobs}
      labels={{
        join: t("joinGroup"),
        posts: t("tabPosts"),
        products: t("tabProducts"),
        services: t("tabServices"),
        jobs: t("tabJobs"),
        members: t("tabMembers"),
        about: t("tabAbout"),
        writePost: t("writePost"),
        publish: t("publish"),
        verifiedMembers: t("verifiedMembers"),
        chatPlaceholder: t("chatPlaceholder"),
        attachImage: t("attachImage"),
        attachVideo: t("attachVideo"),
        attachVoice: t("attachVoice"),
        attachFile: t("attachFile"),
        shareListing: t("shareListing"),
        chooseListing: t("chooseListing"),
        listing: t("listing"),
      }}
    />
  );
}
