"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { useTranslations } from "next-intl";

type PasswordInputProps = Omit<InputProps, "type" | "rightIcon"> & {
  showToggle?: boolean;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ showToggle = true, ...props }, ref) {
    const t = useTranslations("a11y");
    const [visible, setVisible] = useState(false);

    return (
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        autoComplete={props.name === "currentPassword" ? "current-password" : undefined}
        rightIcon={
          showToggle ? (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? t("hidePassword") : t("showPassword")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              tabIndex={-1}
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          ) : undefined
        }
        {...props}
      />
    );
  },
);
