# Compass V2 Design System

Dense, dark-only, Linear-leaning. Built on Mantine v9 + Tailwind v4 (layout only).

Live reference: visit `/design_system` in the app.

## Stack

- **Components:** Mantine v9 (`@mantine/core`, `notifications`, `modals`, `spotlight`, `dates`, `form`)
- **Icons:** `@tabler/icons-react`
- **Theming:** `frontend/src/lib/theme.ts` (single source of truth)
- **Color scheme:** dark-only, forced via `ColorSchemeScript forceColorScheme="dark"` and `MantineProvider forceColorScheme="dark"`
- **Tailwind:** v4, used **only** for layout glue (`flex`, `grid`, `gap-*`, `space-y-*`)

## Rules

1. **Mantine first.** Component identity (buttons, inputs, cards, alerts, tables) is Mantine. Don't restyle with Tailwind utilities.
2. **Every module page opens with `<PageHeader>`.** Title + optional description + optional actions slot.
3. **Group sections with `<DataCard>`.** Use `<EmptyState>` when there's no data yet. Use `<StatCard>` for dashboard tiles.
4. **No light mode.** No `dark:` variants. No conditional theming. Dark is the only mode.
5. **Icons from `@tabler/icons-react`.** Size 14 inline, 16 in alerts/inputs, 20 in headers/empty states. `stroke={1.5}` for header/empty-state icons.
6. **Spotlight is the navigation accelerator.** Register module entries in `src/lib/modules.ts` — the sidebar and `⌘K` palette both read from there.
7. **Default sizes are `sm`.** Don't pass `size` unless you intentionally want different density.
8. **Tabular numerics for stats.** `style={{ fontVariantNumeric: "tabular-nums" }}` on numeric values.

## Primitives

Located in `frontend/src/components/ui/`:

- `PageHeader` — `{ title, description?, actions? }`
- `DataCard` — `{ title?, description?, actions?, children }`
- `EmptyState` — `{ title, description?, icon?, action? }`
- `StatCard` — `{ label, value, delta?, hint? }`

## Shell

Located in `frontend/src/components/shell/`:

- `AppShellChrome` — header + navbar wrapper, mounted in root layout
- `Sidebar` — reads `lib/modules.ts`, highlights active route via `usePathname`
- `CommandPalette` — Mantine `Spotlight`, bound to `⌘K` / `⌘P`

## Adding a module

1. Create `modules/<name>/frontend/page.tsx` (default-exported component).
2. Add a one-line re-export at `frontend/src/app/(modules)/<name>/page.tsx`:
   ```ts
   export { default } from "@modules/<name>/frontend/page";
   ```
3. Register nav in `frontend/src/lib/modules.ts`.
4. Use `<PageHeader>` + `<DataCard>` (and Mantine components) in the page body. Don't ship custom CSS unless something is genuinely missing from Mantine.
