# CarePoint frontend design system

CarePoint uses a quiet, clinical visual language: warm near-white canvas, deep blue-green typography, restrained teal for primary actions, fine borders, and generous spacing. Status colors are semantic, not decorative. Avoid gradients, oversized illustrations, novelty glass effects, and excessive rounded cards in operational workflows.

## Foundations

- **Canvas:** `--background` (`#f5f8f8`); **surface:** `--surface` (`#fff`).
- **Text:** `--foreground` for primary information and `--muted-foreground` for supporting details.
- **Primary:** `--primary` (`#087f8c`). Use for the primary action and selected navigation only.
- **Status:** success, warning, and danger tokens communicate operational state. Never communicate status through color alone; retain a text label.
- **Corners:** 9px for controls, 16px for cards, pill shapes reserved for status.
- **Focus:** visible teal focus ring for keyboard users. Tables must scroll horizontally on small screens.

## Component conventions

- `components/ui/primitives.tsx` contains lightweight shadcn-style Button, Card, Input, and SectionHeading primitives.
- `components/ui/DataTable.tsx` is the TanStack Table leaf component. Pass typed `ColumnDef<TData, TValue>[]` and data from the feature boundary. Sorting is client-side; filtering, pagination, and authorization-sensitive queries should remain server/API concerns.
- Keep reusable, domain-neutral UI in `components/ui`; keep hospital-specific compositions in `components/pages` or domain feature folders.
- Route `page.tsx` files are Server Components by default and should compose a focused feature component. Interactive forms, dialogs, menus, and tables should be the smallest practical Client Components.
- `lib/server-api.ts` is for Server Components and Server Actions; it forwards request cookies and uses `API_INTERNAL_URL`/`API_URL`. `lib/api-client.ts` remains the browser client for interactive flows and uses the public API URL only when required.

## Navigation and security boundary

`proxy.ts` is a fast navigation gate based on the HTTP-only access cookie. It is **not authentication or authorization**: the NestJS guards and role checks remain authoritative. Do not decode or trust client-provided roles in the proxy. The backend's refresh cookie is path-scoped to `/api/auth`, so session refresh remains an API responsibility. If the API is temporarily unavailable, avoid treating a transport error as proof that a session is invalid.

## Suggested page structure

```text
app/(dashboard)/patients/page.tsx       # Server Component route entry
components/pages/patients.client.tsx    # Interactive feature boundary (migrate leaf-by-leaf)
components/ui/DataTable.tsx             # Reusable TanStack table
lib/server-api.ts                       # Server-only API requests
lib/api-client.ts                       # Browser API requests
```

## Dependency / install note

The frontend uses Next.js App Router, React, Lucide, TanStack Table, `clsx`, `tailwind-merge`, and `class-variance-authority`. After changing dependencies, run `pnpm install`, then `pnpm --filter @healthcare/web typecheck` and `pnpm build`.
