# Kalia UI Design Tokens & Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Kalia's placeholder Tailwind-default styling (zinc grayscale, Geist fonts, dark-mode branch, ad hoc repeated utility classes) with a deliberate warm 1950s-pastel design system: centralized CSS design tokens plus three small shared UI primitives (`Button`, `Badge`, `Card`), applied across every existing page and component.

**Architecture:** Two-layer CSS custom-property tokens (raw color/font primitives → semantic aliases) added to the existing `frontend/app/globals.css`, mapped into Tailwind v4 utilities via the file's existing `@theme inline` block (no new config file, no new dependency). Three presentational React primitives in a new `frontend/components/ui/` directory consume those utilities; every existing page/component is then migrated onto the tokens and primitives in place — no routing, API, or data-fetching changes.

**Tech Stack:** Next.js 16 (App Router, Server Components), Tailwind CSS v4 (CSS-first `@theme`), `next/font/google` (Fraunces, Inter), Vitest + React Testing Library + `jest-axe`, no new npm dependencies.

## Global Constraints

- Palette (exact hex, WCAG 2.1 AA-verified — see spec): background `#FAF3E9`, primary `#2F6F5E`, primary-foreground `#FFFFFF`, accent `#FBEAE5`, accent-foreground `#2B2725`, foreground `#2B2725`, muted-foreground `#5A5450`, border `#EDE4D6`, surface `#FFFFFF`.
- No dark mode: the `@media (prefers-color-scheme: dark)` block and every `dark:` Tailwind variant are removed, not adapted.
- Typography: `Fraunces` (display/headings, `font-display` utility) + `Inter` (body/UI, new default `font-sans`). Geist Sans and Geist Mono are removed entirely.
- Zero new npm dependencies — no `clsx`, `tailwind-merge`, or `class-variance-authority`. A hand-rolled `cn()` helper and plain variant functions/strings do the same job at this scale.
- Tailwind v4 CSS-first convention only — tokens live in `frontend/app/globals.css`'s `@theme inline` block, exactly like the file's current (pre-change) structure. No `tailwind.config.ts`.
- Arrow functions only, no function declarations/expressions (ESLint `no-restricted-syntax`, ADR-independent frontend convention).
- Every new/changed component keeps a `jest-axe` assertion on any test that does a full `render(...)`, per existing convention.
- Spacing and border-radius use Tailwind's default scale directly (`rounded-lg`, `p-4`, etc.) — no new spacing/radius tokens.
- Spec: [docs/superpowers/specs/2026-07-23-ui-design-design.md](../specs/2026-07-23-ui-design-design.md).

---

### Task 1: `cn()` class-name helper

**Files:**
- Create: `frontend/lib/cn.ts`
- Test: `frontend/lib/cn.test.ts`

**Interfaces:**
- Produces: `cn(...classes: Array<string | false | null | undefined>): string` — joins truthy class names with a single space, used by every primitive in Tasks 3–5 and every migrated component from Task 7 onward.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/lib/cn.test.ts
import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names with a space", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("skips falsy values", () => {
    expect(cn("a", false, undefined, null, "", "b")).toBe("a b");
  });

  it("returns an empty string when nothing is truthy", () => {
    expect(cn(false, undefined)).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run lib/cn.test.ts`
Expected: FAIL — `Cannot find module './cn'` (or similar resolution error), since `cn.ts` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/lib/cn.ts
type ClassValue = string | false | null | undefined;

export const cn = (...classes: ClassValue[]): string => {
  return classes.filter((value): value is string => Boolean(value)).join(" ");
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run lib/cn.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/cn.ts frontend/lib/cn.test.ts
git commit -m "Add cn() class-name helper (iteration 2 task 8)"
```

---

### Task 2: Design token rewrite (`globals.css`)

**Files:**
- Modify: `frontend/app/globals.css` (full rewrite of the file's contents)

**Interfaces:**
- Produces: Tailwind utility classes consumed by every later task: `bg-background`, `text-foreground`, `bg-surface`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `bg-accent`, `text-accent-foreground`, `text-focus-ring`/`outline-focus-ring`, `font-display`, `font-sans`. The `--font-fraunces` / `--font-inter` CSS variables this file references are produced by Task 6 (root layout); until Task 6 lands, `font-display`/`font-sans` fall back to the generic `serif`/`sans-serif` keywords appended below, so the app keeps building and rendering (just with system fonts) in between.

- [ ] **Step 1: Replace the file contents**

```css
/* frontend/app/globals.css */
@import "tailwindcss";

:root {
  /* Primitives — warm 1950s pastel palette (iteration 2 task 8). Full
     palette kept even where a shade (mint-100, coral-700) has no current
     consumer, matching how Tailwind itself ships full color scales. */
  --cream-50: #faf3e9;
  --mint-600: #2f6f5e;
  --mint-100: #eaf5f1;
  --coral-700: #a8503f;
  --coral-100: #fbeae5;
  --charcoal-900: #2b2725;
  --charcoal-500: #5a5450;
  --border-200: #ede4d6;

  /* Semantic aliases — components reference these, never the primitives
     above, so a future re-theme only touches this block.
     Contrast (WCAG 2.1 AA, re-verified at runtime by @axe-core/playwright):
     foreground on background/surface ~14.8:1 (needs 4.5:1); white on
     primary ~5.9:1 (needs 4.5:1); foreground on accent ~13:1; primary as
     a focus-ring/non-text indicator ~5.9:1 (needs 3:1). */
  --background: var(--cream-50);
  --surface: #ffffff;
  --foreground: var(--charcoal-900);
  --muted-foreground: var(--charcoal-500);
  --border: var(--border-200);
  --primary: var(--mint-600);
  --primary-foreground: #ffffff;
  --accent: var(--coral-100);
  --accent-foreground: var(--charcoal-900);
  --focus-ring: var(--mint-600);
}

@theme inline {
  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-foreground: var(--foreground);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-focus-ring: var(--focus-ring);
  /* --font-fraunces / --font-inter come from next/font/google in
     app/[locale]/layout.tsx (Task 6); the generic fallback keeps builds
     and renders working before that lands. */
  --font-display: var(--font-fraunces, serif);
  --font-sans: var(--font-inter, sans-serif);
}

body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
}

:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
  border-radius: 2px;
}
```

- [ ] **Step 2: Verify the app still builds**

Run: `cd frontend && npm run build`
Expected: build succeeds (no Tailwind/PostCSS errors). Headings/buttons will render in fallback system fonts and unstyled color-wise until later tasks land — that's expected at this point.

- [ ] **Step 3: Verify the existing suite is unaffected**

Run: `cd frontend && npm test`
Expected: PASS — same pass count as before this change (no test asserts on color/font classes today, so nothing should break).

- [ ] **Step 4: Commit**

```bash
git add frontend/app/globals.css
git commit -m "Replace placeholder styling with warm-pastel design tokens (iteration 2 task 8)"
```

---

### Task 3: `Button` primitive

**Files:**
- Create: `frontend/components/ui/button.tsx`
- Test: `frontend/components/ui/button.test.tsx`

**Interfaces:**
- Consumes: `cn` from `frontend/lib/cn.ts` (Task 1); `--color-primary`, `--color-primary-foreground`, `--color-border`, `--color-foreground` utilities (Task 2).
- Produces: `type ButtonVariant = "primary" | "outline"`; `buttonVariants(variant?: ButtonVariant): string`; `Button` — a `<button>` wrapper accepting all native `ButtonHTMLAttributes<HTMLButtonElement>` plus `variant?: ButtonVariant`. Both are consumed directly (as a `className` on `<Link>`) in Tasks 7 and 11, and via `<Button>` in Task 10.

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/components/ui/button.test.tsx
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("renders a native button and fires onClick", async () => {
    const onClick = vi.fn();
    const { container } = render(<Button onClick={onClick}>Save</Button>);

    screen.getByRole("button", { name: "Save" }).click();

    expect(onClick).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("defaults to the primary variant", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" }).className).toBe(buttonVariants("primary"));
  });

  it("merges a custom className with the outline variant", () => {
    render(
      <Button variant="outline" className="extra">
        Cancel
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Cancel" }).className).toBe(
      `${buttonVariants("outline")} extra`,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run components/ui/button.test.tsx`
Expected: FAIL — `Cannot find module './button'`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// frontend/components/ui/button.tsx
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "outline";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-border text-foreground hover:border-primary",
};

export const buttonVariants = (variant: ButtonVariant = "primary"): string => {
  return cn(
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
    variantClasses[variant],
  );
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export const Button = ({ variant = "primary", className, ...props }: ButtonProps) => {
  return <button className={cn(buttonVariants(variant), className)} {...props} />;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run components/ui/button.test.tsx`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/ui/button.tsx frontend/components/ui/button.test.tsx
git commit -m "Add Button primitive (iteration 2 task 8)"
```

---

### Task 4: `Badge` primitive

**Files:**
- Create: `frontend/components/ui/badge.tsx`
- Test: `frontend/components/ui/badge.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 1); `--color-surface`, `--color-muted-foreground`, `--color-border`, `--color-accent`, `--color-accent-foreground` utilities (Task 2).
- Produces: `type BadgeVariant = "neutral" | "accent"`; `Badge` — a `<span>` wrapper accepting `HTMLAttributes<HTMLSpanElement>` plus `variant?: BadgeVariant` (default `"neutral"`). Consumed in Task 8 (`BeerList`).

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/components/ui/badge.test.tsx
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders the accent variant with its text and no a11y violations", async () => {
    const { container } = render(<Badge variant="accent">10.2 %</Badge>);

    expect(screen.getByText("10.2 %")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("defaults to the neutral variant", () => {
    render(<Badge>Quadrupel</Badge>);

    expect(screen.getByText("Quadrupel")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run components/ui/badge.test.tsx`
Expected: FAIL — `Cannot find module './badge'`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// frontend/components/ui/badge.tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "neutral" | "accent";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border border-border bg-surface text-muted-foreground",
  accent: "bg-accent text-accent-foreground",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant };

export const Badge = ({ variant = "neutral", className, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run components/ui/badge.test.tsx`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/ui/badge.tsx frontend/components/ui/badge.test.tsx
git commit -m "Add Badge primitive (iteration 2 task 8)"
```

---

### Task 5: `Card` primitive

**Files:**
- Create: `frontend/components/ui/card.tsx`
- Test: `frontend/components/ui/card.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 1); `--color-border`, `--color-surface` utilities (Task 2).
- Produces: `cardVariants: string` — the bare chrome (border/radius/background, deliberately **without** padding, see note below) for call sites that must keep their own element (`<li>`, `<dl>`) rather than nest a `<div>`; `Card` — a ready-to-use `<div>` wrapper (chrome + default padding) for call sites that can use a plain div. Consumed in Tasks 8 and 9.
- **Why `cardVariants` excludes padding:** Tailwind utilities of the same CSS property (e.g. two different `p-*` classes) don't override by their position in the `className` string — precedence follows Tailwind's generated stylesheet order, which is easy to get backwards by accident. Task 8's empty-state box needs `p-12` and Task 9's stat panel needs `p-4`; keeping padding out of the shared string and letting each call site set its own `p-*` once avoids ever having two padding utilities fighting in the same class list. `Card` itself is a single call site, so it can safely default to `p-4` internally.

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/components/ui/card.test.tsx
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Card, cardVariants } from "./card";

describe("Card", () => {
  it("renders children inside the card chrome and merges extra classes", async () => {
    const { container } = render(<Card className="extra">content</Card>);

    const card = screen.getByText("content");
    expect(card).toBeInTheDocument();
    expect(card.className).toBe(`${cardVariants} p-4 extra`);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("cardVariants", () => {
  it("is a non-empty class string without a padding utility", () => {
    expect(cardVariants.length).toBeGreaterThan(0);
    expect(cardVariants).not.toMatch(/(^|\s)p-\d/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run components/ui/card.test.tsx`
Expected: FAIL — `Cannot find module './card'`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// frontend/components/ui/card.tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const cardVariants = "rounded-lg border border-border bg-surface";

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn(cardVariants, "p-4", className)} {...props} />;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run components/ui/card.test.tsx`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/ui/card.tsx frontend/components/ui/card.test.tsx
git commit -m "Add Card primitive (iteration 2 task 8)"
```

---

### Task 6: Root layout — fonts, skip link, header

**Files:**
- Modify: `frontend/app/[locale]/layout.tsx`

**Interfaces:**
- Consumes: `--color-surface`, `--color-foreground`, `--color-focus-ring` utilities (Task 2); produces the `--font-fraunces` / `--font-inter` CSS variables Task 2's `--font-display`/`--font-sans` reference.
- No test file: matches the existing convention (no `layout.test.tsx` exists today — `frontend/README.md` notes async Server Components with async children can't be rendered by RTL outside Next's RSC runtime). Verified by build + manual browser check in Task 16.

- [ ] **Step 1: Replace the font imports and usage**

In `frontend/app/[locale]/layout.tsx`, replace:

```tsx
import { Geist, Geist_Mono } from "next/font/google";
```

with:

```tsx
import { Fraunces, Inter } from "next/font/google";
```

Replace:

```tsx
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

with:

```tsx
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
```

Replace the `<html>` className:

```tsx
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
```

with:

```tsx
    <html
      lang={locale}
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
```

- [ ] **Step 2: Re-token the skip link and header**

Replace:

```tsx
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-zinc-900 focus:outline focus:outline-2 focus:outline-focus-ring dark:focus:bg-zinc-900 dark:focus:text-zinc-100"
        >
          {t("a11y.skipToContent")}
        </a>
        <Providers>
          <header className="flex justify-end p-2">
            <LocaleSwitcher />
          </header>
          {/* Plain wrapper, not <main> — every page under {children} already
              renders its own <main>; this just gives the skip link a
              focusable target (WCAG technique SCR28). Focus-ring styling
              here is a placeholder pending task 8's design tokens. */}
          <div id="main-content" tabIndex={-1} className="focus:outline-none">
```

with:

```tsx
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2 focus:text-foreground focus:outline focus:outline-2 focus:outline-focus-ring"
        >
          {t("a11y.skipToContent")}
        </a>
        <Providers>
          <header className="flex justify-end p-4">
            <LocaleSwitcher />
          </header>
          {/* Plain wrapper, not <main> — every page under {children} already
              renders its own <main>; this just gives the skip link a
              focusable target (WCAG technique SCR28). */}
          <div id="main-content" tabIndex={-1} className="focus:outline-none">
```

- [ ] **Step 3: Verify the app builds**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Run the full test suite**

Run: `cd frontend && npm test`
Expected: PASS — same pass count as before (no test targets `layout.tsx` directly).

- [ ] **Step 5: Commit**

```bash
git add frontend/app/[locale]/layout.tsx
git commit -m "Swap Geist for Fraunces/Inter and re-token the root layout (iteration 2 task 8)"
```

---

### Task 7: Home page

**Files:**
- Modify: `frontend/app/[locale]/page.tsx`
- Test (existing, unchanged assertions — just re-run): `frontend/app/[locale]/page.test.tsx`

**Interfaces:**
- Consumes: `buttonVariants` (Task 3), `cn` (Task 1), `font-display`/`text-foreground`/`text-muted-foreground` utilities (Task 2).

- [ ] **Step 1: Update the page**

Replace the full contents of `frontend/app/[locale]/page.tsx`:

```tsx
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { cn } from "@/lib/cn";

type Props = { params: Promise<{ locale: string }> };

const Home = async ({ params }: Props) => {
  const locale = toLocale((await params).locale);
  const { t } = await getTranslation(locale);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
        {t("app.name")}
      </h1>
      <p className="text-lg text-muted-foreground">{t("app.tagline")}</p>
      <Link href={`/${locale}/beers`} className={cn(buttonVariants("primary"), "mt-2")}>
        {t("app.browseCatalog")}
      </Link>
    </main>
  );
};

export default Home;
```

- [ ] **Step 2: Run the existing test**

Run: `cd frontend && npx vitest run "app/[locale]/page.test.tsx"`
Expected: PASS — 2 tests passed (assertions are role/text-based, unaffected by the class changes).

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/[locale]/page.tsx"
git commit -m "Re-token the home page (iteration 2 task 8)"
```

---

### Task 8: `BeerList` — Card and Badge

**Files:**
- Modify: `frontend/features/catalog/BeerList.tsx`
- Test (existing, unchanged assertions): `frontend/features/catalog/BeerList.test.tsx`

**Interfaces:**
- Consumes: `cardVariants` (Task 5), `Badge` (Task 4), `cn` (Task 1).

- [ ] **Step 1: Update the component**

Replace the full contents of `frontend/features/catalog/BeerList.tsx`:

```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cardVariants } from "@/components/ui/card";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { formatPrice } from "./formatPrice";
import type { BeerSummary } from "./types";

export const BeerList = async ({
  locale,
  beers,
}: {
  locale: Locale;
  beers: BeerSummary[];
}) => {
  const { t } = await getTranslation(locale);

  if (beers.length === 0) {
    return (
      <div className={cn(cardVariants, "border-dashed p-12 text-center")}>
        <p className="text-lg font-medium text-foreground">{t("catalog.empty.title")}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("catalog.empty.hintPrefix")}{" "}
          <Link href={`/${locale}/beers`} className="font-medium underline underline-offset-2">
            {t("catalog.empty.clearLink")}
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {beers.map((beer) => (
        <li
          key={beer.id}
          className={cn(
            cardVariants,
            "relative p-4 transition-colors hover:border-primary focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring",
          )}
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-foreground">
              {/* Stretched link makes the whole card clickable; the ring on
                  the <li> above (focus-within) is what's visible, not this
                  anchor's own small text box. */}
              <Link
                href={`/${locale}/beers/${beer.id}`}
                className="after:absolute after:inset-0 focus-visible:outline-none"
              >
                {beer.name}
              </Link>
            </h2>
            <span className="shrink-0 text-sm font-medium text-foreground">
              {formatPrice(beer.price, locale)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{beer.brewery.name}</p>
          <p className="mt-2 flex flex-wrap gap-1 text-sm">
            <Badge variant="neutral">{beer.style}</Badge>
            <Badge variant="accent">{beer.abv} %</Badge>
          </p>
        </li>
      ))}
    </ul>
  );
};
```

- [ ] **Step 2: Run the existing test**

Run: `cd frontend && npx vitest run features/catalog/BeerList.test.tsx`
Expected: PASS — 4 tests passed (all assertions are role/text-based: link names/hrefs, visible text for name/brewery/style/abv/price — unaffected by wrapping style/abv in `Badge` or swapping card classes).

- [ ] **Step 3: Commit**

```bash
git add frontend/features/catalog/BeerList.tsx
git commit -m "Re-token BeerList with Card and Badge (iteration 2 task 8)"
```

---

### Task 9: `BeerDetailsCard` and the beer detail page

**Files:**
- Modify: `frontend/features/catalog/BeerDetailsCard.tsx`
- Modify: `frontend/app/[locale]/beers/[id]/page.tsx`
- Test (existing, unchanged assertions): `frontend/features/catalog/BeerDetailsCard.test.tsx`, `frontend/app/[locale]/beers/[id]/page.test.tsx`

**Interfaces:**
- Consumes: `cardVariants` (Task 5), `cn` (Task 1).

- [ ] **Step 1: Update `BeerDetailsCard`**

Replace the full contents of `frontend/features/catalog/BeerDetailsCard.tsx`:

```tsx
import { cardVariants } from "@/components/ui/card";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { formatPrice } from "./formatPrice";
import type { BeerDetails } from "./types";

const breweryLocation = (city: string | undefined, country: string): string => {
  return city ? `${city}, ${country}` : country;
};

export const BeerDetailsCard = async ({
  locale,
  beer,
}: {
  locale: Locale;
  beer: BeerDetails;
}) => {
  const { t } = await getTranslation(locale);

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          {beer.name}
        </h1>
        <p className="text-muted-foreground">
          {beer.brewery.name} — {breweryLocation(beer.brewery.city, beer.brewery.country)}
        </p>
      </header>
      <dl className={cn(cardVariants, "flex flex-wrap gap-x-10 gap-y-4 p-4")}>
        <div>
          <dt className="text-sm text-muted-foreground">{t("beer.style")}</dt>
          <dd className="mt-1 font-medium text-foreground">{beer.style}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("beer.abv")}</dt>
          <dd className="mt-1 font-medium text-foreground">{beer.abv} %</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("beer.price")}</dt>
          <dd className="mt-1 font-medium text-foreground">{formatPrice(beer.price, locale)}</dd>
        </div>
      </dl>
      {beer.description && (
        <p className="max-w-prose leading-relaxed text-foreground">{beer.description}</p>
      )}
    </article>
  );
};
```

- [ ] **Step 2: Update the beer detail page's back link**

In `frontend/app/[locale]/beers/[id]/page.tsx`, replace:

```tsx
      <Link
        href={`/${locale}/beers`}
        className="text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
      >
```

with:

```tsx
      <Link
        href={`/${locale}/beers`}
        className="text-sm text-muted-foreground underline underline-offset-2"
      >
```

- [ ] **Step 3: Run the existing tests**

Run: `cd frontend && npx vitest run features/catalog/BeerDetailsCard.test.tsx "app/[locale]/beers/[id]/page.test.tsx"`
Expected: PASS — 3 + 5 tests passed (role/text-based assertions, unaffected).

- [ ] **Step 4: Commit**

```bash
git add frontend/features/catalog/BeerDetailsCard.tsx "frontend/app/[locale]/beers/[id]/page.tsx"
git commit -m "Re-token BeerDetailsCard and the beer detail page (iteration 2 task 8)"
```

---

### Task 10: `SearchFilters`

**Files:**
- Modify: `frontend/features/catalog/SearchFilters.tsx`
- Test (existing, unchanged assertions): `frontend/features/catalog/SearchFilters.test.tsx`

**Interfaces:**
- Consumes: `buttonVariants` (Task 3).

- [ ] **Step 1: Update the component**

In `frontend/features/catalog/SearchFilters.tsx`, replace:

```tsx
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import type { BeerSearchParams } from "./types";

const inputClasses =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";
```

with:

```tsx
import { buttonVariants } from "@/components/ui/button";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import type { BeerSearchParams } from "./types";

const inputClasses =
  "w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground";
```

Replace the submit button:

```tsx
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {t("catalog.filters.submit")}
        </button>
```

with:

```tsx
        <button type="submit" className={buttonVariants("primary")}>
          {t("catalog.filters.submit")}
        </button>
```

- [ ] **Step 2: Run the existing test**

Run: `cd frontend && npx vitest run features/catalog/SearchFilters.test.tsx`
Expected: PASS — 3 tests passed (label/value/role assertions, unaffected).

- [ ] **Step 3: Commit**

```bash
git add frontend/features/catalog/SearchFilters.tsx
git commit -m "Re-token SearchFilters with the Button primitive (iteration 2 task 8)"
```

---

### Task 11: `Pagination`

**Files:**
- Modify: `frontend/features/catalog/Pagination.tsx`
- Test (existing, unchanged assertions): `frontend/features/catalog/Pagination.test.tsx`

**Interfaces:**
- Consumes: `buttonVariants` (Task 3).

- [ ] **Step 1: Update the component**

In `frontend/features/catalog/Pagination.tsx`, replace:

```tsx
import Link from "next/link";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { buildBeerSearchParams } from "./api";
import type { BeerPage, BeerSearchParams } from "./types";
```

with:

```tsx
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { buildBeerSearchParams } from "./api";
import type { BeerPage, BeerSearchParams } from "./types";
```

Replace:

```tsx
  const { t } = await getTranslation(locale);
  const linkClasses =
    "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500";

  return (
    <nav aria-label={t("catalog.pagination.label")} className="flex items-center justify-between">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
```

with:

```tsx
  const { t } = await getTranslation(locale);
  const linkClasses = buttonVariants("outline");

  return (
    <nav aria-label={t("catalog.pagination.label")} className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
```

- [ ] **Step 2: Run the existing test**

Run: `cd frontend && npx vitest run features/catalog/Pagination.test.tsx`
Expected: PASS — 2 tests passed (role/href assertions, unaffected).

- [ ] **Step 3: Commit**

```bash
git add frontend/features/catalog/Pagination.tsx
git commit -m "Re-token Pagination with the Button primitive (iteration 2 task 8)"
```

---

### Task 12: `LocaleSwitcher`

**Files:**
- Modify: `frontend/features/i18n/LocaleSwitcher.tsx`
- Test (existing, unchanged assertions): `frontend/features/i18n/LocaleSwitcher.test.tsx`

- [ ] **Step 1: Update the component**

In `frontend/features/i18n/LocaleSwitcher.tsx`, replace:

```tsx
          className={
            locale === currentLocale
              ? "font-semibold underline underline-offset-2"
              : "text-zinc-600 hover:underline dark:text-zinc-400"
          }
```

with:

```tsx
          className={
            locale === currentLocale
              ? "font-semibold text-foreground underline underline-offset-2"
              : "text-muted-foreground hover:underline"
          }
```

- [ ] **Step 2: Run the existing test**

Run: `cd frontend && npx vitest run features/i18n/LocaleSwitcher.test.tsx`
Expected: PASS — 2 tests passed (role/href/aria-current assertions, unaffected).

- [ ] **Step 3: Commit**

```bash
git add frontend/features/i18n/LocaleSwitcher.tsx
git commit -m "Re-token LocaleSwitcher (iteration 2 task 8)"
```

---

### Task 13: Catalog page heading and not-found page

**Files:**
- Modify: `frontend/app/[locale]/beers/page.tsx`
- Modify: `frontend/app/[locale]/beers/[id]/not-found.tsx`
- Test (existing, unchanged assertions): `frontend/app/[locale]/beers/page.test.tsx`

- [ ] **Step 1: Update the catalog page heading**

In `frontend/app/[locale]/beers/page.tsx`, replace:

```tsx
      <h1 className="text-3xl font-bold tracking-tight">{t("catalog.title")}</h1>
```

with:

```tsx
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        {t("catalog.title")}
      </h1>
```

- [ ] **Step 2: Update the not-found page**

Replace the full contents of `frontend/app/[locale]/beers/[id]/not-found.tsx`:

```tsx
import { headers } from "next/headers";
import Link from "next/link";
import { getTranslation } from "@/i18n/server";
import { defaultLocale, isLocale, type Locale } from "@/i18n/settings";

/**
 * not-found.tsx receives no props (Next.js convention) — the locale is
 * recovered from the x-pathname header proxy.ts sets on every request.
 */
const BeerNotFound = async () => {
  const requestHeaders = await headers();
  const pathnameLocale = requestHeaders.get("x-pathname")?.split("/")[1] ?? "";
  const locale: Locale = isLocale(pathnameLocale) ? pathnameLocale : defaultLocale;
  const { t } = await getTranslation(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        {t("notFound.title")}
      </h1>
      <p className="text-muted-foreground">{t("notFound.message")}</p>
      <Link
        href={`/${locale}/beers`}
        className="mt-4 font-medium text-foreground underline underline-offset-2"
      >
        {t("notFound.backLink")}
      </Link>
    </main>
  );
};

export default BeerNotFound;
```

- [ ] **Step 3: Run the existing test**

Run: `cd frontend && npx vitest run "app/[locale]/beers/page.test.tsx"`
Expected: PASS — 3 tests passed (metadata/param assertions, unaffected by heading class changes; `not-found.tsx` has no dedicated test today, consistent with existing coverage).

- [ ] **Step 4: Commit**

```bash
git add "frontend/app/[locale]/beers/page.tsx" "frontend/app/[locale]/beers/[id]/not-found.tsx"
git commit -m "Re-token the catalog page heading and not-found page (iteration 2 task 8)"
```

---

### Task 14: Document the convention in `frontend/README.md`

**Files:**
- Modify: `frontend/README.md`

- [ ] **Step 1: Add a Conventions bullet**

In `frontend/README.md`'s "## Conventions" section, add a new bullet after the WCAG 2.1 AA bullet (the last one in the list):

```markdown
- **Design tokens & shared UI primitives (iteration 2 task 8):** the color
  palette and typography are centralized as CSS custom properties in
  `app/globals.css`, in two layers — raw primitives (e.g. `--mint-600`)
  and semantic aliases (e.g. `--color-primary`) that components actually
  reference — mapped into Tailwind v4 utilities via the file's `@theme
  inline` block (CSS-first, no `tailwind.config.ts`). Fraunces (display/
  headings) and Inter (body/UI) are loaded via `next/font/google` in
  `app/[locale]/layout.tsx`. Light-mode only — no dark theme. Three small
  shared primitives live in `components/ui/`: `Button`/`buttonVariants`,
  `Badge`, and `Card`/`cardVariants` — the seam for a possible future
  design-system extraction. No new dependency: variant selection is a
  hand-rolled `cn()` helper (`lib/cn.ts`), not `clsx`/`tailwind-merge`/
  `class-variance-authority`.
```

- [ ] **Step 2: Verify the file renders as valid markdown**

Run: `cd frontend && npx markdownlint README.md 2>/dev/null || true`
Expected: this repo has no markdownlint config wired to a script — this is a best-effort sanity check, not a gate. If the command isn't available, visually confirm in the Read tool that the bullet is indented/formatted consistently with its neighbors instead.

- [ ] **Step 3: Commit**

```bash
git add frontend/README.md
git commit -m "Document design tokens and shared UI primitives convention (iteration 2 task 8)"
```

---

### Task 15: Roadmap doc-sync

**Files:**
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Tick task 8**

In `docs/roadmap.md`, change:

```markdown
8. [ ] UI design: preliminary design for Kalia — minimalistic and hipstery feel; consult the product owner on colors, fonts and functionality; centralize the look in themes/design tokens; keep a future design-system extraction possible. Outcome: a professional, production-grade look. Worth reaching for the `/frontend-design` skill for aesthetic direction if available, and `/accessibility-review` for a design-stage WCAG pass on the new tokens/components — complementary to the code-stage a11y pipeline from task 7, not a replacement for it
```

to:

```markdown
8. [x] UI design: preliminary design for Kalia — minimalistic and hipstery feel; consult the product owner on colors, fonts and functionality; centralize the look in themes/design tokens; keep a future design-system extraction possible. Outcome: a professional, production-grade look. Worth reaching for the `/frontend-design` skill for aesthetic direction if available, and `/accessibility-review` for a design-stage WCAG pass on the new tokens/components — complementary to the code-stage a11y pipeline from task 7, not a replacement for it
```

- [ ] **Step 2: Re-check the iteration's "Done when" line**

Read the "Done when" line under "## Iteration 2 — Frontend standards & UI design" (`docs/roadmap.md:72`): *"decisions 1–6 are documented and the existing code migrated to them; catalog pages pass automated WCAG 2.1 AA checks; the UI implements the new design with both Finnish and English translations; all suites green."* Confirm in the PR description that this still holds after task 8 (it does — no new untranslated strings were introduced; `Button`/`Badge`/`Card` render only text passed in by callers, which already goes through `t()`) **and** note explicitly that task 9 (standard loading/error/empty states) remains open, so the iteration itself is not yet complete — only task 8 is. Do not tick task 9 or claim the iteration done.

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap.md
git commit -m "Tick iteration 2 task 8 in the roadmap (UI design)"
```

---

### Task 16: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `cd frontend && npm run lint`
Expected: no errors (in particular: no leftover `dark:` variants, no `no-restricted-syntax` violations in the new primitive files, which all use arrow functions).

- [ ] **Step 2: Full unit/component suite**

Run: `cd frontend && npm test`
Expected: PASS — all tests green, including every `jest-axe` assertion in the new and modified component tests.

- [ ] **Step 3: Production build**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 4: E2E, including the WCAG scans**

Run: `cd frontend && npm run test:e2e`
Expected: PASS — including the existing `@axe-core/playwright` `wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa` scans on the catalog pages, which is what actually confirms the computed contrast ratios hold on the rendered page (jsdom, used by the Vitest suite, cannot evaluate real color contrast).

- [ ] **Step 5: Manual browse-through**

Run: `docker compose up --build` from the repo root (start Docker Desktop first if needed: `open -a Docker`, then wait for `docker info` to succeed). Open `http://localhost:3000`, and visually confirm on both `/en` and `/fi`:
- Home page: cream background, Fraunces "Kalia" heading, mint primary CTA button.
- Catalog page (`/beers`): mint search button, cards with the neutral style badge and the coral-tinted ABV badge, mint focus ring visible when tabbing through cards, outline pagination buttons if there are enough results.
- Beer detail page: Fraunces heading, bordered stat panel.
- No remaining dark-mode flash when the OS is set to dark appearance (toggle OS appearance if convenient, or confirm via browser dev tools' `prefers-color-scheme` emulation, that the page stays on the light palette).

Run: `docker compose down` afterward (Playwright's own run in Step 4 may already have started/left a stack running — this step's `docker compose down` cleans up either case, per `frontend/README.md`'s existing note).

- [ ] **Step 6: Final commit if anything was fixed during verification**

If Steps 1–5 required any fixes, commit them individually with a message describing what verification caught. If everything passed as planned, this step is a no-op — proceed to opening the PR (per `CLAUDE.md`'s workflow: push the branch and run `gh pr create` once tests are green, changes are verified by running them, doc-sync is complete, and the roadmap task is ticked).

---

## Self-review notes

- **Spec coverage:** token architecture → Task 2; typography → Tasks 2 & 6; `Button`/`Badge`/`Card` → Tasks 3–5; migration scope table → Tasks 6–13 (one-to-one, plus the previously-unlisted `beers/[id]/page.tsx` back-link folded into Task 9 since it's the same page/feature as `BeerDetailsCard`); verification → Task 16; documentation → Tasks 14–15. No spec section without a task.
- **`cardVariants` padding conflict caught during planning:** the spec didn't specify this at the CSS-utility level, but bundling `p-4` into `cardVariants` would have made Task 8's `p-12` empty-state override non-deterministic (two Tailwind padding utilities on one element don't resolve by className order). Fixed by keeping `cardVariants` padding-free and having each call site set its own `p-*` once.
- **Type/signature consistency:** `buttonVariants(variant?: ButtonVariant)` (Task 3) is called the same way in Tasks 7, 10, 11; `cardVariants` (Task 5, a string) is consumed identically in Tasks 8 and 9; `Badge`'s `variant` prop values (`"neutral" | "accent"`, Task 4) match exactly what Task 8 passes.
