import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileText, FolderOpen, ImageIcon, FileCheck2, FileKey, Paperclip } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { getFilesOverview, listRecentUploads } from "@/server/admin/files";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: `${t("nav.files")} · ${t("title")}` };
}

export default async function AdminFilesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const localeFmt = locale === "ar" ? "ar-EG" : "nl-NL";

  const { forbidden } = await requireAdminPage(locale, "files.view");
  if (forbidden) return <AccessDenied />;

  const [overview, uploads] = await Promise.all([getFilesOverview(), listRecentUploads({})]);
  const c = overview.counts;

  const cards = [
    { label: t("files.listingMedia"), value: c.listingMedia.toLocaleString(localeFmt), icon: <ImageIcon className="h-5 w-5" /> },
    { label: t("files.productImages"), value: c.productImages.toLocaleString(localeFmt), icon: <FileText className="h-5 w-5" /> },
    { label: t("files.serviceImages"), value: c.serviceImages.toLocaleString(localeFmt), icon: <FileText className="h-5 w-5" /> },
    { label: t("files.postImages"), value: c.postImages.toLocaleString(localeFmt), icon: <FolderOpen className="h-5 w-5" /> },
    { label: t("files.verificationDocs"), value: c.verificationDocuments.toLocaleString(localeFmt), icon: <FileCheck2 className="h-5 w-5" /> },
    { label: t("files.supportAttachments"), value: c.supportAttachments.toLocaleString(localeFmt), icon: <Paperclip className="h-5 w-5" /> },
  ];

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.files")} description={t("files.subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <h3 className="mb-2 mt-6 flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileKey className="h-4 w-4" />
        {t("files.recent")}
      </h3>
      <AdminTable headers={[t("files.kind"), t("files.url"), t("files.ref"), t("common.date")]}>
        {uploads.items.map((item, i) => (
          <tr key={`${item.kind}-${i}`}>
            <TableCell><span className="capitalize">{item.kind}</span></TableCell>
            <TableCell>
              <a href={item.url} target="_blank" rel="noreferrer" className="truncate text-brand-700 hover:underline dark:text-brand-300">
                {item.url}
              </a>
            </TableCell>
            <TableCell className="max-w-56 truncate">{item.refTitle ?? item.ref}</TableCell>
            <TableCell>{item.createdAt.toLocaleDateString(localeFmt)}</TableCell>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
