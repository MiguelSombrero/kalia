import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { federatedSignOut } from "./actions";
import { AuthSubmitButton } from "./AuthSubmitButton";

type Props = { className?: string; children: ReactNode };

export const SignOutButton = ({ className, children }: Props) => (
  <form action={federatedSignOut} className={className}>
    <AuthSubmitButton className={cn(buttonVariants("outline"), className)}>{children}</AuthSubmitButton>
  </form>
);
