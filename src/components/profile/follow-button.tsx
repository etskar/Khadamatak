"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserPlus, UserMinus } from "lucide-react";
import { followUserAction, unfollowUserAction } from "@/server/actions/social-actions";
import { toast } from "@/components/ui/toast";

type FollowButtonProps = {
  targetUserId: string;
  isFollowing: boolean;
};

export function FollowButton({ targetUserId, isFollowing: initial }: FollowButtonProps) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const [isFollowing, setIsFollowing] = useState(initial);
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      if (isFollowing) {
        await unfollowUserAction(targetUserId);
        setIsFollowing(false);
      } else {
        await followUserAction(targetUserId);
        setIsFollowing(true);
      }
    } catch {
      toast({ title: tCommon("error"), variant: "danger" });
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${
        isFollowing
          ? "border border-border bg-card text-muted-foreground hover:bg-muted"
          : "bg-primary text-primary-foreground hover:brightness-110"
      }`}
    >
      {isFollowing ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {isFollowing ? t("unfollow") : t("follow")}
    </button>
  );
}
