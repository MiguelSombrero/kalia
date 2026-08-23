"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { cardVariants } from "./card";
import { buttonVariants } from "./button";

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = ({ className, ...props }: ComponentProps<typeof ToastPrimitive.Viewport>) => {
  return (
    <ToastPrimitive.Viewport
      className={cn("fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2", className)}
      {...props}
    />
  );
};

export const Toast = ({ className, ...props }: ComponentProps<typeof ToastPrimitive.Root>) => {
  return (
    <ToastPrimitive.Root
      className={cn(cardVariants, "flex items-center gap-4 p-4 shadow-xl", className)}
      {...props}
    />
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
