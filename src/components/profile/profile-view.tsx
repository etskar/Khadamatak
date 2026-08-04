"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Briefcase, GraduationCap, Settings2, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { PrimaryAction } from "@/components/ui/primary-action";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { FollowButton } from "@/components/profile/follow-button";
import { PostCard, type FeedPost } from "@/components/feed/post-card";

type ProfileData = {
  displayName: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  country: string | null;
  city: string | null;
  work: string | null;
  education: string | null;
  hobbies: string | null;
  languages: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  joinDate: string;
  verificationStatus: string;
  realName?: string | null;
  email?: string | null;
  userId?: string;
  followCounts?: { followers: number; following: number };
  isFollowing?: boolean;
};

export function ProfileView({
  profile,
  posts,
  savedPosts = [],
  isOwner,
}: {
  profile: ProfileData;
  posts: FeedPost[];
  savedPosts?: FeedPost[];
  isOwner: boolean;
}) {
  const t = useTranslations("profile");
  const [tab, setTab] = useState<"posts" | "about" | "photos" | "saved">("posts");

  const hobbies = safeJsonArray(profile.hobbies);
  const languages = safeJsonArray(profile.languages);
  const photos = posts.flatMap((p) =>
    (p.media ?? []).filter((m) => m.type === "image").map((m) => m.url),
  );

  return (
    <div className="animate-in-up">
      <PageHeader
        title={isOwner ? t("title") : profile.displayName}
        actions={
          isOwner ? (
            <div className="flex flex-wrap gap-2">
              <PrimaryAction
                href="/settings"
                icon={Settings2}
                label={t("editProfile")}
                variant="outline"
              />
              {profile.verificationStatus === "verified" ? (
                <PrimaryAction
                  href="/verification"
                  icon={ShieldCheck}
                  label={t("verified")}
                  variant="outline"
                />
              ) : (
                <PrimaryAction
                  href="/verification"
                  icon={ShieldCheck}
                  label={t("verify")}
                />
              )}
            </div>
          ) : profile.userId ? (
            <FollowButton
              targetUserId={profile.userId}
              isFollowing={profile.isFollowing ?? false}
            />
          ) : null
        }
      />

      <Card className="mb-5 overflow-hidden">
        <div
          className="h-28 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 bg-cover bg-center sm:h-40"
          style={
            profile.coverUrl
              ? { backgroundImage: `url(${profile.coverUrl})` }
              : undefined
          }
        />
        <div className="relative px-4 pb-5 sm:px-6">
          <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-3">
              <Avatar
                src={profile.avatarUrl}
                fallback={profile.displayName}
                size="xl"
                className="h-20 w-20 ring-4 ring-card sm:h-24 sm:w-24"
              />
              <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{profile.displayName}</h2>
                <VerificationBadge verified={profile.verificationStatus === "verified"} compact />
              </div>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              </div>
            </div>
          </div>

          {profile.bio ? (
            <p className="mt-4 text-sm leading-relaxed text-foreground">{profile.bio}</p>
          ) : null}

          {profile.followCounts ? (
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span>
                <strong>{profile.followCounts.following}</strong>{" "}
                <span className="text-muted-foreground">{t("following")}</span>
              </span>
              <span>
                <strong>{profile.followCounts.followers}</strong>{" "}
                <span className="text-muted-foreground">{t("followers")}</span>
              </span>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {(profile.city || profile.country) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {[profile.city, profile.country].filter(Boolean).join(", ")}
              </span>
            )}
            {profile.work && (
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {profile.work}
              </span>
            )}
            {profile.education && (
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {profile.education}
              </span>
            )}
          </div>
        </div>
      </Card>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1 no-scrollbar">
        {(
          [
            ["posts", t("posts")],
            ["about", t("about")],
            ["photos", t("photos")],
            ...(isOwner ? ([["saved", t("saved")]] as const) : []),
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as typeof tab)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold ${
              tab === key ? "bg-brand-50 text-brand-700 dark:bg-brand-800/30" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "posts" ? (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noPosts")}</p>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>
      ) : null}

      {tab === "about" ? (
        <Card className="space-y-3 p-5 text-sm">
          {isOwner && profile.realName ? (
            <Row label={t("realName")} value={`${profile.realName} (${t("private")})`} />
          ) : null}
          {isOwner && profile.email ? <Row label={t("email")} value={profile.email} /> : null}
          <Row label={t("joined")} value={new Date(profile.joinDate).toLocaleDateString()} />
          <Row label={t("hobbies")} value={hobbies.join(", ") || "—"} />
          <Row label={t("languages")} value={languages.join(", ") || "—"} />
          <Row label={t("website")} value={profile.website || "—"} />
          {isOwner ? (
            <>
              <Row label={t("contactEmail")} value={profile.contactEmail || "—"} />
              <Row label={t("contactPhone")} value={profile.contactPhone || "—"} />
            </>
          ) : null}
        </Card>
      ) : null}

      {tab === "photos" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">{t("noPhotos")}</p>
          ) : (
            photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="aspect-square rounded-xl object-cover"
              />
            ))
          )}
        </div>
      ) : null}

      {tab === "saved" && isOwner ? (
        <div className="space-y-4">
          {savedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noSaved")}</p>
          ) : (
            savedPosts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium">{value}</span>
    </div>
  );
}

function safeJsonArray(value: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
}
