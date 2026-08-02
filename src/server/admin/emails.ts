import "server-only";
import { db } from "@/lib/db";
import { writeAdminAudit } from "@/server/admin/guard";

export async function listEmailTemplates() {
  return db.emailTemplate.findMany({ orderBy: { key: "asc" } });
}

export async function getEmailTemplate(key: string) {
  return db.emailTemplate.findUnique({ where: { key } });
}

export async function upsertEmailTemplate(input: {
  adminId: string;
  key: string;
  name: string;
  subject: { ar: string; nl: string };
  body: { ar: string; nl: string };
  fromEmail?: string;
  enabled?: boolean;
  variables?: string[];
}) {
  const existing = await db.emailTemplate.findUnique({ where: { key: input.key } });
  const updated = await db.emailTemplate.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      name: input.name,
      subjectJson: JSON.stringify(input.subject),
      bodyJson: JSON.stringify(input.body),
      fromEmail: input.fromEmail,
      enabled: input.enabled ?? true,
      variables: input.variables ? JSON.stringify(input.variables) : null,
    },
    update: {
      name: input.name,
      subjectJson: JSON.stringify(input.subject),
      bodyJson: JSON.stringify(input.body),
      fromEmail: input.fromEmail,
      enabled: input.enabled,
      variables: input.variables ? JSON.stringify(input.variables) : undefined,
    },
  });
  await writeAdminAudit({
    adminId: input.adminId,
    action: "email.template.upsert",
    entityType: "EmailTemplate",
    entityId: updated.id,
    previousValue: existing,
    newValue: { key: input.key },
  });
  return updated;
}

/** Render a template body by replacing {{variable}} placeholders. */
export function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? `{{${name}}}`);
}

export async function testSendEmail(input: {
  adminId: string;
  templateId: string;
  toEmail: string;
  vars?: Record<string, string>;
}) {
  const template = await db.emailTemplate.findUnique({ where: { id: input.templateId } });
  if (!template) throw new Error("TEMPLATE_NOT_FOUND");

  const subjectObj = safeJson(template.subjectJson);
  const bodyObj = safeJson(template.bodyJson);
  const subject = typeof subjectObj === "string" ? subjectObj : (subjectObj as Record<string, string>)?.nl ?? JSON.stringify(subjectObj);
  const body = renderTemplate(
    typeof bodyObj === "string" ? bodyObj : (bodyObj as Record<string, string>)?.nl ?? JSON.stringify(bodyObj),
    input.vars ?? {},
  );

  // Dev email sink — wire a real provider (Resend/SES) in production.
  console.info(`[admin-test-email] to=${input.toEmail} subject=${subject}`);
  const log = await db.emailLog.create({
    data: {
      templateId: template.id,
      toEmail: input.toEmail,
      subject,
      body,
      status: "sent",
      provider: "dev",
      sentAt: new Date(),
    },
  });

  await writeAdminAudit({
    adminId: input.adminId,
    action: "email.test_send",
    entityType: "EmailTemplate",
    entityId: template.id,
    metadata: { toEmail: input.toEmail },
  });
  return log;
}

export async function listEmailLogs(input: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, input.pageSize ?? 20));
  const where: Record<string, unknown> = input.status ? { status: input.status } : {};
  const [items, total] = await Promise.all([
    db.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { template: { select: { key: true, name: true } } },
    }),
    db.emailLog.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
