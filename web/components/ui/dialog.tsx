"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { surfaceVariants } from "./surface";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export type DialogPlacement = "centre" | "bar";

const overlayClasses: Record<DialogPlacement, string> = {
  centre: "fixed inset-0 z-40 bg-foreground/50",
  bar: "fixed inset-x-0 top-14 bottom-0 z-40 bg-foreground/50",
};

const contentClasses: Record<DialogPlacement, string> = {
  centre:
    "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6",
  bar: "fixed inset-x-0 top-14 z-50 max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-x-0 lg:right-8 lg:left-auto lg:w-110 lg:border-x",
};

export const DialogContent = ({
  className,
  children,
  placement = "centre",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { placement?: DialogPlacement }) => {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClasses[placement]} />
      <DialogPrimitive.Content
        className={cn(surfaceVariants, contentClasses[placement], className)}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
};

export const DialogTitle = ({
  className,
  look = "title",
  ...props
}: ComponentProps<typeof DialogPrimitive.Title> & { look?: "title" | "label" }) => {
  return (
    <DialogPrimitive.Title
      className={cn(
        look === "title"
          ? "font-display text-title font-bold text-foreground"
          : "text-label font-semibold uppercase text-foreground",
        className,
      )}
      {...props}
    />
  );
};

export const DialogDescription = ({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) => {
  return (
    <DialogPrimitive.Description
      className={cn("mt-1 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
};
