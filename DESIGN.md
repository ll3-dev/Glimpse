# Glimpse Design System (DESIGN.md)

> **Design Archetype**: Notion-inspired Warm Minimalism × Claude Editorial Calm × Apple Native Restraint  
> **Target Experience**: A calm, distraction-free personal knowledge & visual capture companion.

---

## 1. Visual Theme & Atmosphere

- **Mood**: Thoughtful, warm, tactile, and highly legible. Avoid sterile stark white/black contrasts or loud cyberpunk neon tones.
- **Surface Philosophy**: Content rests on warm off-white canvas (`#f7f6f3`), elevated by crisp white surface cards (`#ffffff`) bounded by subtle hairline borders (`#edece9`).
- **Density**: Comfortable and breathable. Generous padding (`px-6` / `24px` horizontal margins on mobile), structured 8px-grid spacing.
- **Corner Radii**:
  - Small / Badges / Tooltips: `rounded` (4px) or `rounded-md` (6px–8px)
  - Cards & Containers: `rounded-xl` (12px) — `Card` primitive `default`/`muted` variants; `rounded-2xl` (16px) for the `elevated` variant and dialogs/sheets
  - Floating action buttons / Avatars: `rounded-full` (9999px)

---

## 2. Color Palette & Semantic Tokens

All styling should prioritize the semantic tokens defined in `packages/ui/styles/globals.css`.

### Core Colors (Light Mode)

| Token | Hex | Role & Usage |
|---|---|---|
| `app-bg` / `secondary` | `#f7f6f3` | Main app background canvas (warm paper tone) |
| `app-surface` / `background` | `#ffffff` | Card surfaces, modals, elevated sheets, input backgrounds |
| `app-border` / `border` | `#edece9` | Subtle divider lines, card borders, input borders |
| `app-text` / `foreground` | `#37352f` | Primary text, titles, prominent icons (charcoal ink) |
| `app-muted` / `muted-foreground` | `#787774` | Secondary text, timestamps, subtitle notes |
| `app-subtle` | `#9b9a97` | Placeholders, inactive icons, auxiliary metadata |
| `app-primary` / `primary` | `#2383e2` | Primary interactive links, accents, active states |
| `app-accent` / `destructive` | `#eb5757` | Destructive actions, delete badges, warning alerts |

### Pastel Tag / Metadata Tints

Used for item labels, AI classification tags, and category chips. Values below are the light-mode tokens from `packages/ui/styles/globals.css` (each has a matching dark-mode override in the same file):

| Name | Background (`bg-`) | Text Color | Intended Usage |
|---|---|---|---|
| Mint | `#edf7f0` | `#24663b` | Knowledge connections, confirmed status |
| Peach / Amber | `#fcf2e8` | `#8a5020` | Highlights, bookmarks, reading queue |
| Sky / Blue | `#eef5fb` | `#255d88` | Web links, articles, references |
| Lavender | `#f3effa` | `#584578` | AI insights, digests, semantic topics |
| Rose | `#faebeb` | `#9c3838` | Priority items, review reminders |
| Cream / Neutral | `#f0eeec` | `#64625d` | Default tags, neutral categories |

### Foreground-on-Primary Inversion

Foreground text/icon on `app-text`-filled surfaces (primary buttons, `EmptyState` CTA) uses the inverted token `text-app-bg` — never hardcoded white. The shadcn compatibility token follows the same rule: `primary-foreground: var(--color-app-bg)` in `globals.css`.

### Dark Mode (Mobile: Fully Supported)

Mobile dark mode is implemented via uniwind `@variant dark` theme-scoped variables in `globals.css`:

- Background: Rich deep slate/charcoal (`#191919`), not pure `#000000`.
- Card Surface: Elevated dark grey (`#242424`).
- Border: Translucent hairline (`rgba(255, 255, 255, 0.08)`).
- Text: Off-white (`#e3e2de`) and muted grey (`#9b9a97`).
- Tag tints switch to dark-adjusted pairs (e.g. Mint `#1c3829`/`#7ee787`) declared in the same `@variant` block.

Theme selection (`system` / `light` / `dark`) lives in `apps/mobile/src/stores/settings/theme.store.ts` — `Uniwind.setTheme()` applies it and MMKV persists the choice across launches. Never hardcode dark colors in components; always use semantic token classes so the `@variant` overrides apply.

---

## 3. Typography Hierarchy

Use clean system sans-serif (Inter / SF Pro / Geist Variable) with intentional tracking and weights:

| Role | Font Size | Weight | Tracking | Usage Example |
|---|---|---|---|---|
| **Screen Title** | 22px–24px | 700 (Bold) | `-0.5px` | `ScreenHeader` titles ("보관함", "다이제스트") |
| **Section Header** | 18px–20px | 600 (Semibold) | `-0.3px` | Group titles, sheet headers |
| **Card Title** | 15px–16px | 600 (Semibold) | `-0.2px` | `KnowledgeItemCard` title, note headline |
| **Body Regular** | 14px–15px | 400 (Regular) | `0px` | Note content, chat messages, descriptions |
| **Subtext / Meta** | 12px–13px | 500 (Medium) | `0px` | Secondary descriptions, timestamps ("메모 · 3분 전") |
| **Badge / Micro** | 10px–11px | 500 (Medium) | `+0.2px` | Tag chips, label pills, status indicators |

---

## 4. Component Patterns & Rules

### Cards & List Items
- **Structure**: Always wrap interactive list items with `<Card>` or `<Pressable className="... rounded-md border border-app-border bg-app-surface">`.
- **Spacing**: `p-4` internal padding, `mb-2` or `gap-2` between items.
- **Touch Feedback**: Provide subtle opacity/pressed feedback (`active:opacity-80` or Native highlight).
- **Icons**: Use consistent `lucide-react-native` icons sized `20px` for actionable/interactive elements, `16px` for inline card icons, and `14px`+ for micro/meta indicators — colored with semantic tokens (`text-app-muted`, `text-app-text`).

### Screen Headers
- Standardized with `ScreenHeader` primitive:
  - Left: Title (large, semibold) + optional subtitle / count ("12개의 지식").
  - Right: Action icons (Search, Settings, Filter) with `p-2` touch target.

### Floating Action Buttons (FAB) & CTAs
- **Primary FAB**: Pure black (`bg-black` or `bg-app-text`) with white icon (`size={28-30}`), `w-14 h-14 rounded-full shadow-lg`.
- **Standard Button**: 
  - `default`: Dark charcoal fill (`bg-app-text text-white`)
  - `secondary`: Subtle background (`bg-app-bg text-app-text border border-app-border`)
  - `outline`: White surface with border (`bg-app-surface border border-app-border`)
  - `ghost`: Transparent with hover/active state

### Badges & Labels
- Rounded pill/chip: `px-2 py-1 rounded text-[10px] font-medium`.
- Background should use soft muted tones (`bg-app-border/40` or pastel tint palette).

### Empty States
- Standardize on the `EmptyState` primitive (`packages/ui/src/primitives/empty-state.tsx`): centered layout, generous vertical spacing (`py-24`; `compact` variant `py-8` for narrow contexts like chat detail).
- Icon inside a `h-12 w-12` circular surface chip (`rounded-full bg-app-surface border-app-border`), colored `app-muted`, size `20`.
- Concise headline in `app-text`, optional description in `app-muted`, optional single CTA action (`bg-app-text` fill with `text-app-bg` inverted foreground).

---

## 5. Architectural & Code Conventions for Agents

1. **Atomic Primitives First**:
   - Reuse atoms from `@glimpse/ui/primitives` (`Card`, `Button`, `Badge`, `ScreenHeader`, `Input`, `Text`, etc.).
   - Do NOT introduce arbitrary hardcoded colors; use Tailwind classes referencing theme tokens (e.g. `bg-app-bg`, `text-app-text`, `text-app-muted`, `border-app-border`).
2. **Screen vs Component Responsibilities**:
   - Screens (`apps/mobile/app/*`) orchestrate state, queries, and layout frames (`px-6`, safe area padding).
   - Composed feature UI belongs in `src/components/<feature>`.
   - Atomic UI belongs in `packages/ui/src/primitives`.
3. **Restraint & Polish**:
   - No unnecessary card nesting (limit to 1 level of card hierarchy).
   - No gratuitous gradients or neon borders.
   - Maintain consistent padding (`px-6` for mobile screens, `p-4` for card interiors).
