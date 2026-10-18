# CarePoint design system

Direction: **clinical editorial**. White paper, hairline borders, one confident green, one warm accent, and a serif voice for headings. Inspired by the restraint of shadcn/ui (tokens, quiet borders, tight radii, visible focus) but with its own identity.

All styles live in `apps/web/app/styles/` and are imported by `app/globals.css`:

| File | Purpose |
| --- | --- |
| `tokens.css` | Every colour, radius, shadow, font and motion value as a CSS variable |
| `base.css` | Reset, typography defaults, focus ring, reduced-motion handling |
| `shell.css` | Sidebar, inset content sheet, top bar, page header |
| `components.css` | Buttons, fields, tables, badges, banners, modal, empty states |
| `pages.css` | Overview ledger, settings, authentication screens |

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#ffffff` | Sheet, cards, inputs |
| `--canvas` | `#f4f6f1` | App frame behind the sheet, table headers |
| `--foreground` | `#0f1b16` | Ink (primary text) |
| `--muted-foreground` | `#5b6760` | Secondary text |
| `--primary` | `#0b6b4d` | Verdant green: primary actions, active nav, focus |
| `--primary-soft` | `#e6f1ea` | Confirmed state, avatars, success |
| `--accent` | `#e8a526` | Saffron: attention only (pending, awaiting, the brand dot) |
| `--destructive` | `#b3261e` | Destructive actions, cancelled, errors |
| `--slate` | `#3b5668` | Completed state, doctor avatars |
| `--forest` | `#0a2a20` | Sign-in brand panel |

Rules: green is for action and confirmation, saffron is rationed to things that need a human, red is only for destructive or failed. Never hard-code hex in components; add a token.

## Type

- **Instrument Serif** (`--font-display`): page titles, modal titles, overview numerals, sign-in headline.
- **Geist** (`--font-sans`): all UI text. Base size 14px.
- **Geist Mono** (`--font-mono`): eyebrows, IDs, small labels.

Fonts load from Google Fonts in `app/layout.tsx`. Every stack has a system fallback.

## Shape and elevation

Radius: 6 / 8 / 12 / 16 (`--radius-sm` to `--radius-xl`). Controls are 8, panels 12, the content sheet and modals 16. Shadows are deliberately faint (`--shadow-xs`, `--shadow-sm`); only the modal uses `--shadow-pop`.

## Components

- **Buttons**: `.btn` + `.primary | .secondary | .danger`, `.small` for row actions. 36px high.
- **Status**: `StatusBadge` renders a dot pill. Pending is saffron, confirmed/paid/active is green, completed is slate, cancelled/void is red.
- **Stats**: a ledger of figures with a 2px top rule (green, or saffron for `tone="attention"`), not boxed cards.
- **Feedback**: `ErrorBanner`, `SuccessBanner` carry an icon and ARIA roles.
- **Modal**: closes on Escape and backdrop click, exposes `role="dialog"` and a labelled title.

## Motion

Short (140 to 280ms), one easing curve (`--ease`). Page and modal entrances, the live-status ping, and the ECG trace on sign-in. All animation is disabled under `prefers-reduced-motion`.

## Adding to it

1. Need a colour? Add a token in `tokens.css`, then use it.
2. Need a component? Put it in `components.css`, built from existing tokens.
3. Keep the one-accent rule. If two things are saffron, one of them probably is not urgent.
