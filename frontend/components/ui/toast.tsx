"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { cardVariants } from "./card";
import { buttonVariants } from "./button";
import { Icon } from "./icon";

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = ({ className, ...props }: ComponentProps<typeof ToastPrimitive.Viewport>) => {
  return (
    <ToastPrimitive.Viewport
      className={cn("fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2", className)}
      {...props}
    />
  );
};

export type ToastVariant = "success" | "destructive";

const variantClasses: Record<ToastVariant, string> = {
  success: "bg-success text-success-foreground",
  destructive: "bg-destructive text-destructive-foreground",
};

type ToastProps = ComponentProps<typeof ToastPrimitive.Root> & { variant: ToastVariant };

export const Toast = ({ variant, className, children, ...props }: ToastProps) => {
  return (
    <ToastPrimitive.Root
      data-variant={variant}
      className={cn(cardVariants, "flex items-stretch overflow-hidden", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn("flex w-12 shrink-0 items-center justify-center border-r border-border", variantClasses[variant])}
      >
        <Icon name={variant === "success" ? "check" : "close"} strokeWidth={2.5} />
      </span>
      <div className="flex flex-1 items-center gap-4 p-4">{children}</div>
    </ToastPrimitive.Root>
  );
};

export const ToastDescription = ToastPrimitive.Description;

export const ToastAction = ({ className, ...props }: ComponentProps<typeof ToastPrimitive.Action>) => {
  return (
    <ToastPrimitive.Action
      className={cn(buttonVariants("outline"), "shrink-0", className)}
      {...props}
    />
  );
};
