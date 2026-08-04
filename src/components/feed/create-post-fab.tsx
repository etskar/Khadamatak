"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type CreatePostFabProps = {
  className?: string;
};

export function CreatePostFab({ className }: CreatePostFabProps) {
  const t = useTranslations("home");
  const tA11y = useTranslations("a11y");

  return (
    <Link
      href="/create-post"
      aria-label={tA11y("createPost")}
      className={cn(
        "fixed bottom-[calc(var(--bottomnav-height)+var(--safe-bottom)+1rem)] end-4 z-30 flex h-14 items-center gap-2 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 px-5 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 active:scale-95 lg:bottom-8 lg:end-8",
        className,
      )}
    >
      <Plus className="h-5 w-5" strokeWidth={2.5} />
      <span className="hidden sm:inline">{t("createPost")}</span>
    </Link>
  );
}
