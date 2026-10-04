"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type MenuState = {
  open: boolean;
  panelId: string;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  toggle: () => void;
  close: () => void;
};

const MenuContext = createContext<MenuState | null>(null);

const useMenu = (): MenuState => {
  const menu = useContext(MenuContext);
  if (!menu) throw new Error("MobileMenuButton and MobileMenuPanel must sit inside MobileMenu");
  return menu;
};

export const MobileMenu = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const toggle = useCallback(() => setOpen((current) => !current), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return <MenuContext value={{ open, panelId, buttonRef, toggle, close }}>{children}</MenuContext>;
};

export const MobileMenuButton = () => {
  const { open, panelId, buttonRef, toggle } = useMenu();
  const { t } = useTranslation();

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={open ? t("nav.closeMenu") : t("nav.menu")}
      onClick={toggle}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border bg-surface text-foreground hover:bg-surface-sunken"
    >
      <Icon name={open ? "close" : "menu"} className="size-6" />
    </button>
  );
};

export const MobileMenuPanel = ({ children }: { children: ReactNode }) => {
  const { open, panelId, close } = useMenu();

  return (
    <div
      id={panelId}
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest("a")) close();
      }}
      className={cn(
        "max-h-[calc(100dvh-3.5rem)] flex-col gap-4 overflow-y-auto border-t border-border pb-4 pt-2 lg:hidden",
        open ? "flex" : "hidden",
      )}
    >
      {children}
    </div>
  );
};
