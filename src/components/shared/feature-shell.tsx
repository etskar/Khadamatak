import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "./page-header";

type FeatureShellProps = {
  title: string;
  description?: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export function FeatureShell({
  title,
  description,
  emptyTitle,
  emptyDescription,
  icon,
  actions,
  children,
}: FeatureShellProps) {
  return (
    <div className="animate-in-up">
      <PageHeader title={title} description={description} actions={actions} />
      {children ?? (
        <EmptyState
          icon={icon}
          title={emptyTitle}
          description={emptyDescription}
        />
      )}
    </div>
  );
}
