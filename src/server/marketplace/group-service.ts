import "server-only";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { isUserVerified } from "./guards";

export async function listGroups() {
  return db.cityGroup.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true } },
    },
  });
}

export async function getGroupBySlug(slug: string, userId?: string | null) {
  const group = await db.cityGroup.findUnique({
    where: { slug },
    include: {
      members: {
        where: { status: "active" },
        take: 50,
        include: { user: { include: { profile: true, verification: true } } },
      },
      products: {
        where: { status: "active" },
        take: 12,
        include: { media: true, seller: { include: { profile: true } } },
        orderBy: { createdAt: "desc" },
      },
      services: {
        where: { status: "active" },
        take: 12,
        include: { media: true, provider: { include: { profile: true } } },
        orderBy: { createdAt: "desc" },
      },
      jobs: {
        where: { status: "active" },
        take: 12,
        include: { media: true, employer: { include: { profile: true } } },
        orderBy: { createdAt: "desc" },
      },
      groupPosts: {
        where: { deletedAt: null },
        take: 30,
        orderBy: { createdAt: "desc" },
        include: { author: { include: { profile: true } } },
      },
      posts: {
        where: { deletedAt: null },
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          author: { include: { profile: true } },
          media: true,
        },
      },
    },
  });
  if (!group) return null;

  let membership = null;
  if (userId) {
    membership = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });
  }

  return { ...group, membership };
}

export async function requestJoinGroup(userId: string, slug: string) {
  const group = await db.cityGroup.findUnique({ where: { slug } });
  if (!group || group.status !== "active") throw new Error("GROUP_NOT_FOUND");

  if (group.requiresVerification) {
    const ok = await isUserVerified(userId);
    if (!ok) throw new Error("VERIFICATION_REQUIRED");
  }

  const existing = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });
  if (existing?.status === "active") return existing;
  if (existing?.status === "banned") throw new Error("BANNED");

  // Auto-approve verified members for trading cities
  const status = group.requiresVerification ? "active" : "pending";

  const member = existing
    ? await db.groupMember.update({
        where: { id: existing.id },
        data: {
          status,
          joinedAt: status === "active" ? new Date() : null,
        },
      })
    : await db.groupMember.create({
        data: {
          groupId: group.id,
          userId,
          status,
          joinedAt: status === "active" ? new Date() : null,
        },
      });

  if (status === "active") {
    await db.cityGroup.update({
      where: { id: group.id },
      data: { memberCount: { increment: 1 } },
    });
  }

  await writeAuditLog({
    actorUserId: userId,
    action: "group.join",
    entityType: "CityGroup",
    entityId: group.id,
    metadata: { status },
  });

  return member;
}

export async function createGroupPost(input: {
  userId: string;
  slug: string;
  content: string;
  mediaJson?: string | null;
}) {
  const group = await db.cityGroup.findUnique({ where: { slug: input.slug } });
  if (!group) throw new Error("GROUP_NOT_FOUND");

  const member = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: input.userId } },
  });
  if (!member || member.status !== "active") throw new Error("NOT_A_MEMBER");

  return db.groupPost.create({
    data: {
      groupId: group.id,
      authorId: input.userId,
      content: input.content.trim(),
      mediaJson: input.mediaJson ?? null,
    },
    include: { author: { include: { profile: true } } },
  });
}

export async function ensureDefaultCities() {
  const cities = [
    { slug: "amsterdam", name: "Amsterdam", nameAr: "أمستردام", nameNl: "Amsterdam", lat: 52.3676, lng: 4.9041 },
    { slug: "rotterdam", name: "Rotterdam", nameAr: "روتردام", nameNl: "Rotterdam", lat: 51.9244, lng: 4.4777 },
    { slug: "the-hague", name: "The Hague", nameAr: "لاهاي", nameNl: "Den Haag", lat: 52.0705, lng: 4.3007 },
    { slug: "utrecht", name: "Utrecht", nameAr: "أوتريخت", nameNl: "Utrecht", lat: 52.0907, lng: 5.1214 },
    { slug: "eindhoven", name: "Eindhoven", nameAr: "آيندهوفن", nameNl: "Eindhoven", lat: 51.4416, lng: 5.4697 },
    { slug: "groningen", name: "Groningen", nameAr: "خرونينغن", nameNl: "Groningen", lat: 53.2194, lng: 6.5665 },
    { slug: "tilburg", name: "Tilburg", nameAr: "تيلبورخ", nameNl: "Tilburg", lat: 51.5555, lng: 5.0913 },
    { slug: "almere", name: "Almere", nameAr: "ألميره", nameNl: "Almere", lat: 52.3508, lng: 5.2647 },
    { slug: "breda", name: "Breda", nameAr: "بريدا", nameNl: "Breda", lat: 51.5719, lng: 4.7683 },
    { slug: "nijmegen", name: "Nijmegen", nameAr: "نايميخن", nameNl: "Nijmegen", lat: 51.8126, lng: 5.8372 },
    { slug: "haarlem", name: "Haarlem", nameAr: "هارلم", nameNl: "Haarlem", lat: 52.3874, lng: 4.6462 },
    { slug: "arnhem", name: "Arnhem", nameAr: "آرنم", nameNl: "Arnhem", lat: 51.9851, lng: 5.8987 },
    { slug: "enschede", name: "Enschede", nameAr: "إنسخيده", nameNl: "Enschede", lat: 52.2215, lng: 6.8937 },
    { slug: "amersfoort", name: "Amersfoort", nameAr: "أميرسفورت", nameNl: "Amersfoort", lat: 52.1561, lng: 5.3878 },
    { slug: "zwolle", name: "Zwolle", nameAr: "زفوله", nameNl: "Zwolle", lat: 52.5168, lng: 6.083 },
    { slug: "leiden", name: "Leiden", nameAr: "لايدن", nameNl: "Leiden", lat: 52.1601, lng: 4.497 },
    { slug: "maastricht", name: "Maastricht", nameAr: "ماستريخت", nameNl: "Maastricht", lat: 50.8514, lng: 5.691 },
    { slug: "dordrecht", name: "Dordrecht", nameAr: "دوردريخت", nameNl: "Dordrecht", lat: 51.8133, lng: 4.6901 },
    { slug: "delft", name: "Delft", nameAr: "دلفت", nameNl: "Delft", lat: 52.0116, lng: 4.3571 },
    { slug: "s-hertogenbosch", name: "Den Bosch", nameAr: "دين بوش", nameNl: "Den Bosch", lat: 51.6978, lng: 5.3037 },
    { slug: "leeuwarden", name: "Leeuwarden", nameAr: "ليوفاردن", nameNl: "Leeuwarden", lat: 53.2012, lng: 5.7999 },
    { slug: "venlo", name: "Venlo", nameAr: "فينلو", nameNl: "Venlo", lat: 51.3704, lng: 6.1724 },
    { slug: "ede", name: "Ede", nameAr: "إيده", nameNl: "Ede", lat: 52.0333, lng: 5.6667 },
    { slug: "deventer", name: "Deventer", nameAr: "ديفينتر", nameNl: "Deventer", lat: 52.2667, lng: 6.1667 },
    { slug: "sittard", name: "Sittard", nameAr: "سيتارد", nameNl: "Sittard-Geleen", lat: 50.9987, lng: 5.8695 },
    { slug: "emmen", name: "Emmen", nameAr: "إيمين", nameNl: "Emmen", lat: 52.7792, lng: 6.8959 },
    { slug: "alkmaar", name: "Alkmaar", nameAr: "ألكمار", nameNl: "Alkmaar", lat: 52.6324, lng: 4.7484 },
    { slug: "hilversum", name: "Hilversum", nameAr: "هيلفرسوم", nameNl: "Hilversum", lat: 52.2292, lng: 5.1669 },
    { slug: "hoorn", name: "Hoorn", nameAr: "هورن", nameNl: "Hoorn", lat: 52.6472, lng: 5.0599 },
    { slug: "middleburg", name: "Middelburg", nameAr: "ميدلبورخ", nameNl: "Middelburg", lat: 51.4991, lng: 3.6129 },
    { slug: "voorburg", name: "Voorburg", nameAr: "فوربورخ", nameNl: "Voorburg", lat: 52.0765, lng: 4.3576 },
    { slug: "den-helder", name: "Den Helder", nameAr: "دين هيلدر", nameNl: "Den Helder", lat: 52.9563, lng: 4.7609 },
  ];

  for (const c of cities) {
    await db.cityGroup.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        nameAr: c.nameAr,
        nameNl: c.nameNl,
        city: c.name,
        country: "NL",
        description: `${c.name} local community on Khadamatak`,
        latitude: c.lat,
        longitude: c.lng,
        requiresVerification: true,
      },
      update: {
        nameAr: c.nameAr,
        nameNl: c.nameNl,
        latitude: c.lat,
        longitude: c.lng,
      },
    });
  }
}
