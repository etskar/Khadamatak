import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listMarketplaceItems } from "@/server/admin/marketplace";
import {
  setListingStatusAction,
  toggleListingFlagAction,
} from "@/server/actions/admin-actions";
import { formatMoney } from "@/lib/money";

const KINDS = ["product", "service", "job"] as const;
type Kind = (typeof KINDS)[number];

const KIND_STATUSES: Record<Kind, string[]> = {
  product: ["active", "paused", "sold", "deleted", "draft"],
  service: ["active", "paused", "deleted", "draft"],
  job: ["active", "paused", "filled", "deleted", "draft"],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.marketplace")} · ${t("title")}` };
}

export default async function AdminMarketplacePage({
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
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { ctx, forbidden } = await requireAdminPage(locale, "marketplace.view");
  if (forbidden) return <AccessDenied />;

  const kind: Kind = KINDS.includes(sp.kind as Kind) ? (sp.kind as Kind) : "product";
  const canManage = ctx.permissions.has("marketplace.manage");
  const canFeature = ctx.permissions.has("marketplace.feature");

  const data = await listMarketplaceItems({
    kind,
    query: sp.query,
    status: sp.status,
    page: sp.page ? Number(sp.page) : 1,
  });

  const statusOptions = KIND_STATUSES[kind].map((s) => ({
    value: s,
    label: t(`status.${s}`, { defaultValue: s }),
  }));

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.marketplace")} description={t("marketplace.subtitle")} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <Badge
            key={k}
            variant={k === kind ? "default" : "secondary"}
            className="cursor-pointer text-sm capitalize"
          >
            <Link
              href={k === "product" ? "/admin/marketplace" : `/admin/marketplace?kind=${k}`}
              className="inline-flex items-center"
            >
              {t(`marketplace.kind.${k}`)}
            </Link>
          </Badge>
        ))}
      </div>

      <AdminToolbar
        searchPlaceholder={t("common.search")}
        filters={[
          {
            param: "status",
            label: t("common.status"),
            allLabel: t("common.all"),
            options: statusOptions,
          },
        ]}
      />

      <AdminTable headers={[t("common.title"), t("marketplace.seller"), t("common.price"), t("common.status"), t("marketplace.actions")]}>
        {data.items.map((item) => {
          const i = item as unknown as {
            publicId: string;
            title: string;
            status: string;
            priceCents?: number | null;
            featured?: boolean;
            pinned?: boolean;
            company?: string | null;
            seller?: { profile?: { displayName?: string | null; username?: string | null } | null } | null;
            provider?: { profile?: { displayName?: string | null; username?: string | null } | null } | null;
            employer?: { profile?: { displayName?: string | null; username?: string | null } | null } | null;
          };
          const sellerName =
            (i.seller?.profile?.displayName ?? i.seller?.profile?.username) ||
            (i.provider?.profile?.displayName ?? i.provider?.profile?.username) ||
            (i.employer?.profile?.displayName ?? i.employer?.profile?.username) ||
            i.company ||
            "—";
          const priceCents = i.priceCents ?? 0;
          const featured = i.featured ?? false;
          const pinned = i.pinned ?? false;

          return (
            <tr key={i.publicId}>
              <TableCell>
                <Link
                  href={
                    kind === "product"
                      ? `/products/${i.publicId}`
                      : kind === "service"
                        ? `/services/${i.publicId}`
                        : `/jobs/${i.publicId}`
                  }
                  className="font-medium hover:underline"
                >
                  {i.title}
                </Link>
              </TableCell>
              <TableCell>{sellerName}</TableCell>
              <TableCell>
                {kind === "job" ? "—" : formatMoney(priceCents, "EUR", localeFmt)}
              </TableCell>
              <TableCell>
                <StatusBadge status={i.status} />
                {featured ? <Badge variant="success" className="ms-1">★</Badge> : null}
                {pinned ? <Badge variant="outline" className="ms-1">📌</Badge> : null}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {canManage ? (
                    <>
                      {i.status === "active" ? (
                        <AdminActionButton
                          action={setListingStatusAction}
                          label={t("marketplace.hide")}
                          fixedArgs={{ kind, publicId: i.publicId, action: "hide" }}
                          variant="outline"
                          size="sm"
                        />
                      ) : i.status !== "deleted" ? (
                        <AdminActionButton
                          action={setListingStatusAction}
                          label={t("marketplace.restore")}
                          fixedArgs={{ kind, publicId: i.publicId, action: "restore" }}
                          variant="soft"
                          size="sm"
                        />
                      ) : null}
                      {i.status !== "deleted" ? (
                        <AdminActionButton
                          action={setListingStatusAction}
                          label={t("marketplace.delete")}
                          fixedArgs={{ kind, publicId: i.publicId, action: "delete" }}
                          title={t("marketplace.delete")}
                          variant="outline"
                          danger
                          size="sm"
                        />
                      ) : null}
                    </>
                  ) : null}
                  {canFeature ? (
                    <AdminActionButton
                      action={toggleListingFlagAction}
                      label={featured ? t("marketplace.unfeature") : t("marketplace.feature")}
                      fixedArgs={{ kind, publicId: i.publicId, flag: "featured" }}
                      variant="outline"
                      size="sm"
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
