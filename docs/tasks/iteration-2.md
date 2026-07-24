# Iteration 2 — Frontend standards & UI design

Goal: set the standards for UI design and development — architecture
decisions, conventions, localization, accessibility and a professional look —
so later features are easier to add and consistent by default.

1. [x] Decision: TanStack Query for API calls (scoped to client components — ADR-0008); document the decision
2. [x] Decision: Zustand for client application state — user selections only, never API data (that belongs to TanStack Query); document the decision (ADR-0009)
3. [x] Decision: react-hook-form + Zod for forms and validation; document the decision (ADR-0010)
4. [x] Convention: prefer arrow functions over explicit function declarations; document and enforce via ESLint
5. [x] i18next localization with Finnish and English translations; migrate all existing UI text to i18next (ADR-0011)
6. [x] OpenAPI-generated API clients: the backend's OpenAPI spec becomes the source of truth for its APIs. Select the tool **with the product owner** (candidate: [openapi-generator-cli](https://github.com/OpenAPITools/openapi-generator-cli), challengeable) and agree the workflow (spec file copied to frontend vs. generated against a running backend) (ADR-0012)
7. [x] Accessibility per [WCAG 2.1 level AA](https://www.w3.org/WAI/WCAG21/Understanding/conformance): retrofit existing components (aria attributes, roles, focus handling); automate accessibility testing where possible; from here on every new component/page ships accessible. Ask the product owner when something is unclear — retrofitted header landmark, skip link, focus-visible styling, `LocaleSwitcher` ARIA; enforced via `eslint-plugin-jsx-a11y`, `jest-axe`, `@axe-core/playwright`, all riding existing CI jobs (see docs/architecture.md §5/§7)
8. [x] UI design: preliminary design for Kalia — minimalistic and hipstery feel; consult the product owner on colors, fonts and functionality; centralize the look in themes/design tokens; keep a future design-system extraction possible. Outcome: a professional, production-grade look. Worth reaching for the `/frontend-design` skill for aesthetic direction if available, and `/accessibility-review` for a design-stage WCAG pass on the new tokens/components — complementary to the code-stage a11y pipeline from task 7, not a replacement for it
9. [x] Standard loading, error and empty states: Next.js `loading.tsx`/`error.tsx` conventions plus shared UI patterns, applied to the catalog pages *(added by agent: without a standard, every feature invents its own)*

**Done when:** decisions 1–6 are documented and the existing code migrated to them; catalog pages pass automated WCAG 2.1 AA checks; the UI implements the new design with both Finnish and English translations; all suites green.
