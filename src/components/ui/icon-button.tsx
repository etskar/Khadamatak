import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";

type IconButtonProps = Omit<ButtonProps, "leftIcon" | "rightIcon" | "children"> & {
  label: string;
  children: React.ReactNode;
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, className, size = "icon", variant = "ghost", children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        aria-label={label}
        title={label}
        variant={variant}
        size={size}
        className={cn(className)}
        {...props}
      >
        {children}
      </Button>
    );
  },
);

IconButton.displayName = "IconButton";
