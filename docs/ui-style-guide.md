# UI Style Guide

This document outlines the design system and UI patterns for the Glimpse application.

## 1. Design Principles
- **Minimalist & Clean:** Inspired by Notion's aesthetic.
- **Content-First:** Focus on the user's data (knowledge items, reviews).
- **Platform Native Feel:** Respect safe areas and platform interactions while maintaining a consistent brand look.

## 2. Colors
Defined in `global.css` via CSS variables and Tailwind classes.

| Token | Class | Hex | Usage |
|-------|-------|-----|-------|
| Background | `bg-app-bg` | `#f7f6f3` | Main screen background |
| Surface | `bg-app-surface` | `#ffffff` | Cards, modals, inputs |
| Border | `border-app-border` | `#edece9` | Dividers, card borders |
| Text Main | `text-app-text` | `#37352f` | Primary content |
| Text Muted | `text-app-muted` | `#787774` | Secondary text, captions |
| Text Subtle | `text-app-subtle` | `#9b9a97` | Placeholders, disabled states |
| Primary | `text-app-primary` | `#2383e2` | Active states, links, buttons |
| Accent | `text-app-accent` | `#eb5757` | Destructive actions, alerts |

## 3. Typography
Use standard Tailwind text utilities.

- **Screen Title:** `text-xl font-bold tracking-tight text-app-text` (e.g., "보관함", "설정")
- **Section Header:** `text-sm font-bold text-app-muted uppercase tracking-tight`
- **Body:** `text-base text-app-text`
- **Caption:** `text-xs text-app-muted`

## 4. Components

### Screen Header (`ScreenHeader`)
Standard header for all screens.
- **Props:** `title`, `subtitle` (optional), `leftElement` (back button), `rightElement` (actions).
- **Usage:**
  ```tsx
  <ScreenHeader
    title="Page Title"
    leftElement={<BackButton />}
  />
  ```

### Card (`Card`)
Container for grouped content.
- **Style:** White background, rounded corners, subtle border.
- **Usage:**
  ```tsx
  <Card className="p-4">
    <Text>Content</Text>
  </Card>
  ```

### Settings Section (Pattern)
Standard layout for settings groups.
- **Structure:** Icon + Title Header -> Card Content.
- **Spacing:** `mb-8` for the whole section.
- **Header:** `flex-row items-center mb-3`.

## 5. Spacing
- **Screen Padding:** `px-6` (horizontal), `pt-4` (top).
- **Gap:** `gap-2` or `gap-4`.
- **Vertical Spacing:** `mb-4` or `mb-8` between major sections.
