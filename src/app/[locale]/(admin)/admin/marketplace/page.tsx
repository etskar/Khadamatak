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

const KINDS = ["product", "service", "request", "deal"] as const;
type Kind = (typeof KINDS)[number];

const KIND_STATUSES: Record<Kind, string[]> = {
  product: ["active", "paused", "sold", "deleted", "draft"],
  service: ["active", "paused", "deleted", "draft"],
  request: ["open", "in_progress", "closed", "cancelled"],
  deal: ["proposed", "accepted", "rejected", "cancelled", "payment_pending", "in_escrow", "completed", "disputed"],
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
  const tAct = await getTranslations("admin.actions");
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
              href={
                k === "product"
                  ? "/admin/marketplace"
                  : `/admin/marketplace?kind=${k}`
              }
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
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- union of listing shapes */}
        {data.items.map((item: any) => {
          const publicId = item.publicId;
          const sellerName =
            (item.seller?.profile?.displayName ?? item.seller?.profile?.username) ||
            (item.provider?.profile?.displayName ?? item.provider?.profile?.username) ||
            (item.owner?.profile?.displayName ?? item.owner?.profile?.username) ||
            (item.buyer?.profile?.displayName ?? item.buyer?.profile?.username) ||
            "—";
          const price = item.priceCents ?? item.amountCents ?? item.budgetCents;
          const isListing = kind === "product" || kind === "service" || kind === "request";
          const isFlag = kind === "product" || kind === "service";
          return (
            <tr key={item.id}>
              <TableCell>
                <p className="max-w-64 truncate font-medium text-foreground">
                  {item.title ?? item.terms}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.createdAt.toLocaleDateString(localeFmt)}
                </p>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5">
                  <a
                    href={`/admin/users/${item.sellerId ?? item.providerId ?? item.ownerId ?? item.buyerId ?? ""}`}
                    className="text-brand-700 hover:underline dark:text-brand-300"
                  >
                    {sellerName}
                  </a>
                </span>
              </TableCell>
              <TableCell>
                {price != null ? formatMoney(price, "EUR", localeFmt) : "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
                {item.featured ? (
                  <Badge variant="warning" className="ms-1">
                    {t("marketplace.featured")}
                  </Badge>
                ) : null}
                {item.pinned ? (
                  <Badge variant="warning" className="ms-1">
                    {t("marketplace.pinned")}
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {isListing && canManage ? (
                    <>
                      <AdminActionButton
                        action={setListingStatusAction}
                        label={tAct("hide")}
                        fixedArgs={{ kind, publicId, action: "hide" }}
                        confirm={false}
                      />
                      <AdminActionButton
                        action={setListingStatusAction}
                        label={tAct("restore")}
                        fixedArgs={{ kind, publicId, action: "restore" }}
                        confirm={false}
                        variant="soft"
                      />
                      <AdminActionButton
                        action={setListingStatusAction}
                        label={tAct("delete")}
                        fixedArgs={{ kind, publicId, action: "delete" }}
                        title={tAct("delete")}
                        danger
                      />
                    </>
                  ) : null}
                  {isFlag && canFeature ? (
                    <>
                      <AdminActionButton
                        action={toggleListingFlagAction}
                        label={tAct("feature")}
                        fixedArgs={{ kind, publicId, flag: "featured" }}
                        confirm={false}
                        variant="soft"
                      />
                      <AdminActionButton
                        action={toggleListingFlagAction}
                        label={tAct("pin")}
                        fixedArgs={{ kind, publicId, flag: "pinned" }}
                        confirm={false}
                        variant="soft"
                      />
                    </>
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
