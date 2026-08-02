import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import {
  listCmsPages,
  listCmsSections,
  listCmsBanners,
  listCmsMenu,
} from "@/server/admin/cms";
import {
  upsertCmsPageFlatAction,
  setCmsPageStatusAction,
  deleteCmsPageAction,
  upsertCmsSectionAction,
  deleteCmsSectionAction,
  upsertCmsBannerAction,
  deleteCmsBannerAction,
  upsertCmsMenuItemAction,
  deleteCmsMenuItemAction,
} from "@/server/actions/admin-actions";

const TABS = ["pages", "sections", "banners", "menu"] as const;

function jsonTitle(v: string | null): string {
  if (!v) return "—";
  try {
    const parsed = JSON.parse(v);
    return typeof parsed === "string" ? parsed : (parsed?.nl ?? parsed?.ar ?? "—");
  } catch {
    return v;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.cms")} · ${t("title")}` };
}

export default async function AdminCmsPage({
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

  const { ctx, forbidden } = await requireAdminPage(locale, "cms.view");
  if (forbidden) return <AccessDenied />;

  const tab = TABS.includes(sp.tab as (typeof TABS)[number]) ? (sp.tab as (typeof TABS)[number]) : "pages";
  const canManage = ctx.permissions.has("cms.manage");

  const [pages, sections, banners, menu] = await Promise.all([
    listCmsPages({ status: sp.status, query: sp.query }),
    listCmsSections(),
    listCmsBanners({}),
    listCmsMenu({}),
  ]);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.cms")} description={t("cms.subtitle")} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((v) => (
          <Badge key={v} variant={tab === v ? "default" : "secondary"} className="cursor-pointer text-sm">
            <a href={v === "pages" ? "/admin/cms" : `/admin/cms?tab=${v}`}>
              {t(`cms.tab.${v}`)}
            </a>
          </Badge>
        ))}
        {canManage && tab === "pages" ? (
          <AdminActionButton
            action={upsertCmsPageFlatAction}
            label={t("cms.newPage")}
            title={t("cms.newPage")}
            fields={[
              { name: "slug", label: t("cms.slug"), required: true },
              { name: "titleAr", label: `${t("cms.title")} (AR)` },
              { name: "titleNl", label: `${t("cms.title")} (NL)` },
              { name: "status", label: t("common.status"), type: "select", options: [{ value: "draft", label: "draft" }, { value: "published", label: "published" }] },
            ]}
          />
        ) : null}
      </div>

      {tab === "pages" ? (
        <>
          <AdminToolbar searchPlaceholder={t("cms.search")} />
          <AdminTable headers={[t("cms.slug"), t("cms.title"), t("common.status"), t("common.date"), t("cms.actions")]}>
            {pages.items.map((page) => (
              <tr key={page.id}>
                <TableCell className="font-mono">{page.slug}</TableCell>
                <TableCell>{jsonTitle(page.titleJson)}</TableCell>
                <TableCell><StatusBadge status={page.status} /></TableCell>
                <TableCell>{page.updatedAt.toLocaleDateString(localeFmt)}</TableCell>
                <TableCell>
                  {canManage ? (
                    <div className="flex flex-wrap gap-1.5">
                      {page.status !== "published" ? (
                        <AdminActionButton action={setCmsPageStatusAction} label={tAct("approve")} fixedArgs={{ id: page.id, status: "published" }} confirm={false} variant="soft" />
                      ) : null}
                      {page.status !== "draft" ? (
                        <AdminActionButton action={setCmsPageStatusAction} label="draft" fixedArgs={{ id: page.id, status: "draft" }} confirm={false} variant="soft" />
                      ) : null}
                      <AdminActionButton action={deleteCmsPageAction} label={tAct("delete")} fixedArgs={{ id: page.id }} title={tAct("delete")} danger />
                    </div>
                  ) : null}
                </TableCell>
              </tr>
            ))}
          </AdminTable>
        </>
      ) : null}

      {tab === "sections" ? (
        <AdminTable headers={[t("cms.key"), t("cms.title"), t("cms.href"), t("common.status"), t("cms.actions")]}>
          {sections.map((section) => (
            <tr key={section.key}>
              <TableCell className="font-mono">{section.key}</TableCell>
              <TableCell>{section.headingJson ? jsonTitle(section.headingJson) : "—"}</TableCell>
              <TableCell>{section.ctaHref ?? "—"}</TableCell>
              <TableCell><StatusBadge status={section.enabled ? "active" : "draft"} /></TableCell>
              <TableCell>
                {canManage ? (
                  <div className="flex flex-wrap gap-1.5">
                    <AdminActionButton action={upsertCmsSectionAction} label={tAct("edit")} fixedArgs={{ key: section.key }} title={t("cms.editSection")} fields={[
                      { name: "headingAr", label: "Heading (AR)" },
                      { name: "headingNl", label: "Heading (NL)" },
                      { name: "ctaHref", label: "CTA href" },
                    ]} />
                    <AdminActionButton action={deleteCmsSectionAction} label={tAct("delete")} fixedArgs={{ key: section.key }} title={tAct("delete")} danger />
                  </div>
                ) : null}
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      ) : null}

      {tab === "banners" ? (
        <AdminTable headers={[t("cms.placement"), t("cms.title"), t("cms.audience"), t("common.status"), t("cms.actions")]}>
          {banners.map((banner) => (
            <tr key={banner.id}>
              <TableCell>{banner.placement}</TableCell>
              <TableCell>{jsonTitle(banner.titleJson)}</TableCell>
              <TableCell>{banner.audience}</TableCell>
              <TableCell><StatusBadge status={banner.active ? "active" : "draft"} /></TableCell>
              <TableCell>
                {canManage ? (
                  <div className="flex flex-wrap gap-1.5">
                    <AdminActionButton action={upsertCmsBannerAction} label={tAct("edit")} fixedArgs={{ id: banner.id }} title={t("cms.editBanner")} fields={[
                      { name: "titleAr", label: "Title (AR)" },
                      { name: "titleNl", label: "Title (NL)" },
                      { name: "linkUrl", label: "Link" },
                    ]} />
                    <AdminActionButton action={deleteCmsBannerAction} label={tAct("delete")} fixedArgs={{ id: banner.id }} title={tAct("delete")} danger />
                  </div>
                ) : null}
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      ) : null}

      {tab === "menu" ? (
        <AdminTable headers={[t("cms.placement"), t("cms.title"), t("cms.href"), t("cms.sortOrder"), t("cms.actions")]}>
          {menu.map((item) => (
            <tr key={item.id}>
              <TableCell>{item.placement}</TableCell>
              <TableCell>{jsonTitle(item.labelJson)}</TableCell>
              <TableCell>{item.href}</TableCell>
              <TableCell>{item.sortOrder}</TableCell>
              <TableCell>
                {canManage ? (
                  <div className="flex flex-wrap gap-1.5">
                    <AdminActionButton action={upsertCmsMenuItemAction} label={tAct("edit")} fixedArgs={{ id: item.id }} title={t("cms.editMenuItem")} fields={[
                      { name: "labelAr", label: "Label (AR)" },
                      { name: "labelNl", label: "Label (NL)" },
                      { name: "href", label: t("cms.href") },
                    ]} />
                    <AdminActionButton action={deleteCmsMenuItemAction} label={tAct("delete")} fixedArgs={{ id: item.id }} title={tAct("delete")} danger />
                  </div>
                ) : null}
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      ) : null}
    </div>
  );
}
