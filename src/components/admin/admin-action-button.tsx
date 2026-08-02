"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { AdminActionResult } from "@/server/actions/admin-actions";

export type AdminActionField = {
  name: string;
  label?: string;
  placeholder?: string;
  type?: "text" | "textarea" | "number" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
};

type AdminActionButtonProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- server actions have heterogeneous inputs
  action: (input: any) => Promise<AdminActionResult>;
  fixedArgs?: Record<string, unknown>;
  fields?: AdminActionField[];
  label: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  successTitle?: string;
  danger?: boolean;
  confirm?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  fullWidth?: boolean;
  disabled?: boolean;
};

export function AdminActionButton({
  action,
  fixedArgs = {},
  fields = [],
  label,
  title,
  description,
  confirmLabel,
  cancelLabel,
  successTitle,
  danger,
  confirm = true,
  variant = "outline",
  size = "sm",
  fullWidth,
  disabled,
}: AdminActionButtonProps) {
  const t = useTranslations("admin.common");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  async function run() {
    setPending(true);
    try {
      const input: Record<string, unknown> = { ...fixedArgs };
      for (const field of fields) {
        input[field.name] = values[field.name] ?? "";
      }
      const result = await action(input);
      if (result.ok) {
        toast({
          title: successTitle ?? t("success"),
          variant: "success",
        });
        setOpen(false);
        setValues({});
      } else {
        toast({
          title: t("error"),
          description: result.error,
          variant: "danger",
        });
      }
    } catch {
      toast({ title: t("error"), variant: "danger" });
    } finally {
      setPending(false);
    }
  }

  async function handleClick() {
    if (!confirm) {
      await run();
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        disabled={disabled || pending}
        onClick={handleClick}
        loading={pending && !confirm}
      >
        {label}
      </Button>

      {confirm ? (
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title={title ?? label}
          description={description}
        >
          <div className="space-y-4">
            {fields.map((field) => {
              const value = values[field.name] ?? "";
              if (field.type === "textarea") {
                return (
                  <Textarea
                    key={field.name}
                    name={field.name}
                    label={field.label}
                    placeholder={field.placeholder}
                    value={value}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        [field.name]: e.target.value,
                      }))
                    }
                    required={field.required}
                  />
                );
              }
              if (field.type === "select" && field.options) {
                return (
                  <label
                    key={field.name}
                    className="flex w-full flex-col gap-1.5"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {field.label}
                      {field.required ? (
                        <span className="ms-1 text-danger" aria-hidden>
                          *
                        </span>
                      ) : null}
                    </span>
                    <select
                      name={field.name}
                      className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm text-foreground shadow-xs transition-all focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      value={value}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [field.name]: e.target.value,
                        }))
                      }
                      required={field.required}
                    >
                      <option value="">—</option>
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }
              return (
                <Input
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  placeholder={field.placeholder}
                  type={
                    field.type === "number"
                      ? "number"
                      : field.type === "select"
                        ? undefined
                        : "text"
                  }
                  value={value}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [field.name]: e.target.value,
                    }))
                  }
                  required={field.required}
                />
              );
            })}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                {cancelLabel ?? t("cancel")}
              </Button>
              <Button
                type="button"
                variant={danger ? "danger" : "primary"}
                onClick={run}
                loading={pending}
              >
                {confirmLabel ?? t("confirm")}
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
