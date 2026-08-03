"use client";

import { useTranslations } from "next-intl";
import { ImagePlus, Smile } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useUiStore } from "@/stores/ui-store";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";

export function CreatePostBox() {
  const t = useTranslations("home");
  const { data: session } = useSession();
  const setCreatePostOpen = useUiStore((s) => s.setCreatePostOpen);
  const displayName = session?.user?.name;
  const avatarUrl = session?.user?.image;

  return (
    <div className="sticky top-[calc(var(--topnav-height)+0.5rem)] z-20 rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Link href={session?.user ? "/profile" : "/login"}>
          <Avatar src={avatarUrl} fallback={displayName ?? "G"} />
        </Link>
        <button
          type="button"
          onClick={() => setCreatePostOpen(true)}
          className="h-11 flex-1 rounded-full border border-border bg-muted/60 px-4 text-start text-sm text-muted-foreground transition hover:border-brand-300 hover:bg-muted"
        >
          {t("whatToShare")}
        </button>
      </div>
      <div className="mt-2.5 flex items-center gap-1 border-t border-border/60 pt-2.5">
        <button
          type="button"
          onClick={() => setCreatePostOpen(true)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ImagePlus className="h-4 w-4 text-brand-600" />
          {t("photo")}
        </button>
        <button
          type="button"
          onClick={() => setCreatePostOpen(true)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Smile className="h-4 w-4 text-warning" />
          {t("feeling")}
        </button>
      </div>
    </div>
  );
}
