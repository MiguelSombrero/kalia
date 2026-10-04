"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribeToNothing = () => () => {};

type Props = { className?: string; children: ReactNode };

// Disabled until hydrated, ADR-0025. React reads getServerSnapshot during
// hydration too, so this stays `false` until hydration has committed.
export const AuthSubmitButton = ({ className, children }: Props) => {
  const hydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  return (
    <button type="submit" disabled={!hydrated} className={className}>
      {children}
    </button>
  );
};
