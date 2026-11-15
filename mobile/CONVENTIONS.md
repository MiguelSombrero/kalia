# Mobile code conventions

The app follows [web/CONVENTIONS.md](../web/CONVENTIONS.md) wherever a rule is not about the browser.

- **Layers.** `src/app/` route files only re-export a screen from `src/features/<feature>/index.ts`; a feature never imports another; the update, maintenance and crash screens import nothing that can change under an installed build (`independentScreenFiles`, [ADR-0093](../docs/adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)). ESLint enforces both; a new policy gets a fixture in `eslint-fixtures/` ([ADR-0012](../docs/adr/0012-orval-api-client.md)).
- **A label or colour per API enum value comes from `enumLookup()`** in
  `@kalia/api`, never a `Record` keyed by the enum (ESLint,
  [packages/README.md](../packages/README.md)): an installed app outlives the
  backend build it was written against.
- **A route file never holds a test:** Expo Router makes every file under `src/app/` a route.
- **Arrow functions, no classes, `type` over `interface`, no `console.*`**
  ([ADR-0037](../docs/adr/0037-functional-modules.md),
  [ADR-0013](../docs/adr/0013-logging-conventions.md)); the device log goes
  through `src/lib/log/deviceLog.ts`, which takes fields, never an object.
- **A lint warning fails, and imports are sorted** by `eslint --max-warnings 0` and `simple-import-sort/imports`; the two rules are written in [web/CONVENTIONS.md](../web/CONVENTIONS.md), which they share.
- **Conditional JSX is a ternary, `cond ? <X /> : null`, never `cond && <X />`** (ESLint, `no-restricted-syntax`): on React Native `&&` on a zero renders a bare string outside `<Text>` and crashes. An `&&` inside a style array or a prop is not JSX children and stays.
- **A platform difference is `Platform.select` for a value, or an `.ios.tsx` / `.android.tsx` file for a component** (ESLint rejects `Platform.OS` inside JSX). Outside JSX, `Platform.OS` is allowed; a test that sets it cannot move `Platform.select`, which Jest binds to iOS.
- **A Zustand store is read through a selector,** `useFiltersStore((state) => state.applied)`, never `useFiltersStore()`: a whole-store read re-renders on every change in it (ESLint, `no-restricted-syntax` on a `use…Store()` call with no argument).
- **Query defaults are set once, on the `QueryClient`** (`src/lib/query/createQueryClient.ts`: `staleTime` 60 s, `retry: false`), because a screen that fails shows its own error and Retry button. A `useQuery`, `useInfiniteQuery` or `useMutation` that sets `retry` itself fails ESLint unless its `eslint-disable-next-line no-restricted-syntax -- <why>` gives the reason.
- **The catalog waits one pause, `PAUSE_MS` (300 ms), through one hook,** `features/catalog/hooks/useDebounced.ts`, for both the search text and the filter sheet's choices; a second debounce is that hook's second caller, never a second timer (`useDebounced.test.ts`, under fake timers; no lint rule holds this).
- **`src/testing/` is imported by test files only** (`*.test.ts(x)`, and its own files): ESLint's `boundaries/dependencies` rejects it from `app`, `features`, `components` and `lib`, so a fake token store cannot ship.
- **A call that reads a status as an answer declares it, in its feature's `api.ts`:** `getBeer(id, { answers: [404] })`. The transport logs every other status of 400 or above as an error and a declared one not at all; declare only what the screen shows as an answer, never a status to quieten a log. It logs the route template, never the path, so a user's name stays out of the device log ([ADR-0013](../docs/adr/0013-logging-conventions.md)).
- **UI state in a feature-scoped Zustand `store.ts`,** never API data ([ADR-0009](../docs/adr/0009-zustand-ui-state.md)).
- **The generated client is reached only through a feature's `api.ts`,** never
  edited, regenerated with `make api-drift` ([ADR-0012](../docs/adr/0012-orval-api-client.md)).
- **No origin or port is written in the app:** `src/lib/config/origins.ts` reads
  `EXPO_PUBLIC_*` and throws at start-up when one is missing.
- **Tokens live only in `expo-secure-store`,** never AsyncStorage, a query cache
  or a log, and an API call gets its token only from `src/lib/auth/`
  ([ADR-0095](../docs/adr/0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)).
- **The token store is a state machine** with storage, OAuth client and clock injected; refresh is single-flight, the new refresh token stored first. A 4xx refusal ends the session; any other failure leaves the user signed in.
- **A change of viewer resets the whole query client** (`src/lib/query/clearOnViewerChange.ts`, wired in `AppProviders`): sign-in, sign-out and a refresh the server refuses all pass through the token store. A query key therefore need not name the viewer, and a hook that caches viewer-dependent data needs no guard of its own. Reset, not `clear()`: tabs stay mounted and would keep showing the last viewer's data.
- **The transport** (`src/lib/api/registerTransport.ts`) retries a `401` once after the shared refresh, one `traceparent` per call
  ([ADR-0088](../docs/adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).
- **The launch check reads `GET /api/v1/app-config`,** remembers the minimum build, and fails open when unreachable (ADR-0093).
- **A country is named by `src/lib/i18n/countryNames.ts`, never `Intl.DisplayNames`:** Hermes on iOS answers a bare code (ADR-0079).
- **Every string comes from `@kalia/locales`** ([ADR-0011](../docs/adr/0011-i18next-localization.md)).
- **Motion and haptics:** use `src/lib/motion/`'s tokens and primitives, never a literal; `haptic()` is for an action's result, and needs the iPhone's System Haptics and Vibration both on ([ADR-0113](../docs/adr/0113-the-phone-moves-a-little-to-explain-a-change-and-is-felt-only-for-the-result-of-an-action.md)).
- **A feature opens the Catalog on one filter through `showCatalogWith`** in `src/lib/catalogLink/` (its Zustand `store.ts`, in `lib` because a feature never imports another; a brewery with its name, a style, or a country code). The Catalog replaces its search, other filters and sort with that filter; the caller closes its own sheet. The search and filters live in a Zustand store for as long as the app is open and start empty on a cold start; the API's query follows the field's text after a 300 ms pause from two characters, or at once on the keyboard's search key.
- **Primitives live in `src/components/`;** a control moves there when a second screen
  uses it, its tests with it. A feature-only one (the catalog's chips) stays.
- **Accessibility is WCAG 2.2 AA** ([ADR-0075](../docs/adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md) maps each criterion onto these rules). No screen reader runs in CI, so a rule no test can judge is walked by hand from [accessibility-walk.md](accessibility-walk.md), each walk recorded in the PR in words:

  | Rule | Checked by |
  | --- | --- |
  | **A pressable has a `role` and a name** (label or text); a title is `role="heading"`; a state is `accessibilityState`, never a word in the label | `expectAccessibleStructure()` (`src/testing/`), applied to every route in `routes.app.test.tsx` and to each screen that works without the rest |
  | **A tap target is at least `theme.spacing.touch` (48)**, by `minHeight`/`minWidth` or `hitSlop` | the same helper reads the declared size; a size left to content is judged on the device |
  | **On iOS a choice is `button` plus `selected`, never `radio` or `checkbox`** (React Native adds English "checked"). `ChoiceRow` says its place ("2 of 5", `a11y.positionInSet`); Android keeps `radio`, which TalkBack speaks | the helper fails an iOS `radio`/`checkbox`; `ChoiceRow.test.tsx` in `en` and `fi`; the walk |
  | **A word a screen reader says is the platform's or ours (`@kalia/locales`),** never React Native's own table | the walk, in a Finnish and an English voice |
  | **Focus follows the page:** a page swap inside a sheet sends `AccessibilityInfo.sendAccessibilityEvent(ref, "focus")` to the new page's heading, going in and coming back | `FiltersSheet.test.tsx`; the walk |
  | **A group of choices is a labelled `radiogroup`;** a list's rows carry their own names | the helper; the walk |
  | **A message the user did not move to is announced** (`useAnnounce`): a failure and an empty result, never a load | `states.test.tsx`; the walk |
  | **Motion stops under reduced motion** ([ADR-0113](../docs/adr/0113-the-phone-moves-a-little-to-explain-a-change-and-is-felt-only-for-the-result-of-an-action.md)) | `motion.reduced.test.tsx` |
  | **Text grows to the largest size** (iOS size 5, Android 200 %, a Jest font scale of 3.1): no `allowFontScaling={false}`, `numberOfLines` or fixed height on text; the tab bar caps its labels (`tabLabelScale`), titles stop at twice (`titleScale`) | `expectScalesWithText()`; `largestText.app.test.tsx` |

  A test that renders the app's routes is `src/testing/*.app.test.tsx`, the one place a test may import across features (ESLint).
- **Use the generated semantic theme for static styling.** The face is Bricolage Grotesque, bundled and loaded
  behind the splash screen by `FontGate`; set text with `textStyle(token, weight)`,
  never a size or `fontWeight` by hand, because the face has one file per weight.
  A beer's colours come from `useBeerStyleColours`, which falls back to the
  neutral pair ([ADR-0110](../docs/adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)).
  The app follows the system's light or dark setting; every colour is read
  through `useThemeColors` or `createThemedStyles`, never a mode's value by
  name, and in dark a beer is a neutral card with its style colour as a slab
  ([ADR-0112](../docs/adr/0112-the-phone-follows-the-system-into-a-dark-mode-of-neutral-cards-with-the-style-colour-in-a-slab.md)).
  Edit `packages/tokens/src/tokens.ts` and regenerate with
  `node scripts/generate-tokens.mjs`; never edit generated files. Runtime
  platform values remain allowed; a value without a semantic token needs a
  reasoned `token-exception` ([ADR-0066](../docs/adr/0066-token-only-styling-is-a-build-check.md),
  [ADR-0107](../docs/adr/0107-one-typescript-token-source-generates-the-webs-css-the-apps-theme-and-keycloaks-stylesheet-by-a-generator-of-our-own.md)).
- **A style sheet is built once, outside the component** (ESLint): `StyleSheet.create` at module level, or `createThemedStyles((colors) => ({…}))` from `src/lib/design/themedStyles.ts` when it reads a colour, which builds the light and dark sheets once. A variant a prop picks is an entry of its own in the style array (`[styles.label, selected && styles.labelSelected]`); only a value known at run time, such as an inset, the keyboard's height or a beer's colour, goes inline.
