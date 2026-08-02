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

  return (
    <GroupDetailClient
      slug={group.slug}
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
        author: p.author.profile?.displayName ?? "User",
        createdAt: p.createdAt.toISOString(),
      }))}
      products={products}
      services={services}
      requests={group.requests.map((r) => ({
        publicId: r.publicId,
        title: r.title,
        description: r.description,
      }))}
      labels={{
        join: t("joinGroup"),
        posts: t("tabPosts"),
        products: t("tabProducts"),
        services: t("tabServices"),
        requests: t("tabRequests"),
        members: t("tabMembers"),
        about: t("tabAbout"),
        writePost: t("writePost"),
        publish: t("publish"),
        verifiedMembers: t("verifiedMembers"),
      }}
    />
  );
}
