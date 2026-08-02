import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { AdminTable, TableCell } from "@/components/admin/admin-table";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { AccessDenied } from "@/components/admin/access-denied";
import { requireAdminPage } from "@/server/admin/page-guard";
import { listEmailTemplates, listEmailLogs } from "@/server/admin/emails";
import {
  upsertEmailTemplateFlatAction,
  testSendEmailAction,
} from "@/server/actions/admin-actions";

function jsonText(v: string | null): string {
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
  return { title: `${t("nav.emails")} · ${t("title")}` };
}

export default async function AdminEmailsPage({
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

  const { ctx, forbidden } = await requireAdminPage(locale, "email.view");
  if (forbidden) return <AccessDenied />;

  const canManage = ctx.permissions.has("email.manage");
  const view = sp.view === "logs" ? "logs" : "templates";

  const [templates, logs] = await Promise.all([
    listEmailTemplates(),
    listEmailLogs({ page: sp.page ? Number(sp.page) : 1 }),
  ]);

  const totalPages = Math.ceil(logs.total / logs.pageSize);

  return (
    <div className="animate-in-up">
      <PageHeader title={t("nav.emails")} description={t("emails.subtitle")} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["templates", "logs"].map((v) => (
          <Badge key={v} variant={view === v ? "default" : "secondary"} className="cursor-pointer text-sm">
            <a href={v === "templates" ? "/admin/emails" : "/admin/emails?view=logs"}>
              {t(`emails.tab.${v}`)}
            </a>
          </Badge>
        ))}
      </div>

      {view === "templates" ? (
        <AdminTable headers={[t("emails.key"), t("emails.name"), t("emails.subject"), t("common.status"), t("emails.actions")]}>
          {templates.map((template) => (
            <tr key={template.id}>
              <TableCell className="font-mono">{template.key}</TableCell>
              <TableCell>{template.name}</TableCell>
              <TableCell className="max-w-56 truncate">{jsonText(template.subjectJson)}</TableCell>
              <TableCell><StatusBadge status={template.enabled ? "active" : "draft"} /></TableCell>
              <TableCell>
                {canManage ? (
                  <div className="flex flex-wrap gap-1.5">
                    <AdminActionButton action={upsertEmailTemplateFlatAction} label={tAct("edit")} fixedArgs={{ key: template.key }} title={t("emails.edit")} fields={[
                      { name: "name", label: t("emails.name") },
                      { name: "subjectAr", label: "Subject (AR)" },
                      { name: "subjectNl", label: "Subject (NL)" },
                      { name: "bodyAr", type: "textarea", label: "Body (AR)" },
                      { name: "bodyNl", type: "textarea", label: "Body (NL)" },
                    ]} />
                    <AdminActionButton action={testSendEmailAction} label={tAct("send")} fixedArgs={{ templateId: template.id }} title={t("emails.testSend")} fields={[
                      { name: "toEmail", label: "Email", required: true },
                    ]} variant="soft" />
                  </div>
                ) : null}
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <>
          <AdminTable headers={[t("common.date"), t("emails.to"), t("emails.subject"), t("emails.template"), t("common.status")]}>
            {logs.items.map((log) => (
              <tr key={log.id}>
                <TableCell>{log.createdAt.toLocaleString(localeFmt)}</TableCell>
                <TableCell>{log.toEmail}</TableCell>
                <TableCell className="max-w-56 truncate">{log.subject}</TableCell>
                <TableCell>{log.template?.key ?? "—"}</TableCell>
                <TableCell><StatusBadge status={log.status} /></TableCell>
              </tr>
            ))}
          </AdminTable>
          <AdminPagination page={logs.page} totalPages={totalPages} total={logs.total} />
        </>
      )}
    </div>
  );
}
