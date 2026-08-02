import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAdminSessionContextOrNull } from "@/server/admin/guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminNavSections } from "@/components/admin/admin-nav";
import { ToastViewport } from "@/components/ui/toast";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await getAdminSessionContextOrNull();

  // Not authenticated: render children (login page) without the admin shell.
  if (!ctx) {
    return (
      <div className="min-h-dvh bg-background">
        {children}
        <ToastViewport />
      </div>
    );
  }

  const t = await getTranslations("admin");

  const sections = adminNavSections
    .map((section) => ({
      label: t(section.labelKey),
      items: section.items
        .filter((item) => ctx.permissions.has(item.permission))
        .map((item) => ({
          href: item.href,
          label: t(item.labelKey),
          icon: <item.icon className="h-5 w-5" />,
        })),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <AdminShell
      sections={sections}
      adminName={ctx.admin.name}
      adminEmail={ctx.admin.email}
      roleName={ctx.role.name}
    >
      {children}
    </AdminShell>
  );
}
