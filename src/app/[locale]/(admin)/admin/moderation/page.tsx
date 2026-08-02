import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { Badge } from "@/components/ui/badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listContent } from "@/server/admin/moderation";
import {
  moderateContentAction,
  togglePostCommentsLockAction,
} from "@/server/actions/admin-actions";

const KINDS = ["post", "comment", "review"] as const;
type Kind = (typeof KINDS)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.moderation")} · ${t("title")}` };
}

export default async function AdminModerationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tAct = await getTranslations("admin.actions");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { ctx, forbidden } = await requireAdminPage(locale, "moderation.view");
  if (forbidden) return <AccessDenied />;

  const kind: Kind = KINDS.includes(sp.kind as Kind) ? (sp.kind as Kind) : "post";
  const canManage = ctx.permissions.has("moderation.manage");
  const canLock = ctx.permissions.has("moderation.lock_comments");

  const data = await listContent({
    kind,
    query: sp.query,
    page: sp.page ? Number(sp.page) : 1,
  });

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.moderation")} description={t("moderation.subtitle")} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <Badge
            key={k}
            variant={k === kind ? "default" : "secondary"}
            className="cursor-pointer text-sm capitalize"
          >
            <a href={k === "post" ? "/admin/moderation" : `/admin/moderation?kind=${k}`}>
              {t(`moderation.kind.${k}`)}
            </a>
          </Badge>
        ))}
      </div>

      <AdminToolbar searchPlaceholder={t("moderation.search")} />

      <AdminTable headers={[t("moderation.content"), t("moderation.author"), t("moderation.likes"), t("moderation.comments"), t("moderation.actions")]}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- union of content shapes */}
        {data.items.map((item: any) => {
          const author =
            item.author?.profile?.displayName ??
            item.author?.profile?.username ??
            item.author?.email ??
            item.subject?.profile?.displayName ??
            item.subject?.profile?.username ??
            "—";
          const isHidden = Boolean(item.hiddenAt);
          return (
            <tr key={item.id}>
              <TableCell className="max-w-72">
                <p className="truncate font-medium text-foreground">{item.content}</p>
                <p className="text-xs text-muted-foreground">
                  {item.createdAt.toLocaleDateString(localeFmt)}
                </p>
              </TableCell>
              <TableCell>{author}</TableCell>
              <TableCell>{item._count?.likes ?? item.likeCount ?? "—"}</TableCell>
              <TableCell>{item._count?.comments ?? "—"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {canManage ? (
                    <>
                      <AdminActionButton
                        action={moderateContentAction}
                        label={tAct(isHidden ? "restore" : "hide")}
                        fixedArgs={{ kind, id: item.id, action: isHidden ? "restore" : "hide" }}
                        confirm={false}
                      />
                      <AdminActionButton
                        action={moderateContentAction}
                        label={tAct("delete")}
                        fixedArgs={{ kind, id: item.id, action: "delete" }}
                        title={tAct("delete")}
                        danger
                      />
                    </>
                  ) : null}
                  {kind === "post" && canLock ? (
                    <AdminActionButton
                      action={togglePostCommentsLockAction}
                      label={tAct("lockComments")}
                      fixedArgs={{ postId: item.id }}
                      confirm={false}
                      variant="soft"
                    />
                  ) : null}
                </div>
              </TableCell>
            </tr>
          );
        })}
      </AdminTable>

      <AdminPagination page={data.page} totalPages={totalPages} total={data.total} />
    </div>
  );
}
