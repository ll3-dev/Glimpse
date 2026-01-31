# React Native Reusables Guide

This document covers how to use **React Native Reusables (RNR)** in the Glimpse project. RNR brings shadcn/ui-style components to React Native with NativeWind/Uniwind styling.

---

## Overview

React Native Reusables is a copy-paste component library (like shadcn/ui) that:
- Provides 30+ production-ready UI components
- Uses **Tailwind CSS** via NativeWind/Uniwind for styling
- Components live in your codebase (fully customizable)
- Built on **@rn-primitives** for accessible, unstyled primitives
- Uses **Class Variance Authority (CVA)** for type-safe variants

Official documentation: https://reactnativereusables.com/

---

## Installation & Setup

### 1. Install the CLI

```bash
# Install the CLI globally or use npx
npm install -D @react-native-reusables/cli
```

### 2. Create components.json

RNR requires a `components.json` configuration file in your project root:

```json
{
  "$schema": "https://reactnativereusables.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "global.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

### 3. Run the Doctor Command

Check if your project is properly configured:

```bash
npx @react-native-reusables/cli@latest doctor
```

This checks for:
- Babel config (Nativewind preset)
- Root layout (Portal provider)
- Required dependencies

---

## Adding Components

### Using the CLI

```bash
# Add a single component
npx @react-native-reusables/cli@latest add button

# Add multiple components
npx @react-native-reusables/cli@latest add button input card dialog

# Interactive mode (select from list)
npx @react-native-reusables/cli@latest add

# Add all components
npx @react-native-reusables/cli@latest add --all

# Overwrite existing files
npx @react-native-reusables/cli@latest add dialog --overwrite
```

The CLI automatically:
- Downloads component files to `components/ui/`
- Installs missing dependencies
- Handles component dependencies (e.g., dialog → button, text, portal)

---

## Available Components

| Category | Components |
|----------|------------|
| **Form** | button, input, textarea, checkbox, radio-group, select, switch, toggle, slider |
| **Navigation** | tabs, menubar, context-menu, dropdown-menu, navigation-menu |
| **Feedback** | alert, alert-dialog, toast, progress, skeleton |
| **Layout** | card, separator, aspect-ratio, collapsible, accordion |
| **Display** | avatar, badge, text |
| **Overlay** | dialog, popover, tooltip, hover-card |

---

## Usage Example

```tsx
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function Screen() {
  return (
    <Card className="p-4">
      <Input placeholder="Enter text..." />
      <Button variant="default" size="lg">
        Submit
      </Button>
    </Card>
  );
}
```

---

## Component Customization

Since components live in your codebase, you can modify them directly:

```tsx
// components/ui/button.tsx
const buttonVariants = cva(
  "base-classes...",
  {
    variants: {
      variant: {
        default: "bg-primary",
        // Add your own variant
        gradient: "bg-gradient-to-r from-purple-500 to-pink-500",
      },
    },
  }
);
```

---

## Uniwind Compatibility

This project uses **Uniwind** instead of NativeWind. RNR components are compatible because:

1. Both use Tailwind CSS class syntax
2. Both support platform selectors (`ios:`, `android:`, `native:`)
3. Both support dark mode (`dark:`)
4. CVA variants work identically

### Key Differences

| NativeWind | Uniwind |
|------------|---------|
| Runtime class parsing | Build-time class parsing |
| `nativewind-env.d.ts` | `uniwind-types.d.ts` |
| Babel: `nativewind/babel` | Babel: `uniwind/babel` |

RNR components work with Uniwind as-is—they just use standard Tailwind classes.

---

## Existing Components in Project

This project already has shadcn-style components:

- `alert-dialog.tsx` - Modal alerts
- `badge.tsx` - Status badges
- `button.tsx` - Button with variants
- `card.tsx` - Card containers
- `input.tsx` - Text input
- `separator.tsx` - Dividers
- `text.tsx` - Typography
- `textarea.tsx` - Multi-line input
- `tooltip.tsx` - Hover tooltips
- `view.tsx` - View wrapper

These follow the same pattern as RNR components (CVA + @rn-primitives).

---

## Adding New Components via RNR

To add components not already in the project:

```bash
# Example: Add tabs component
npx @react-native-reusables/cli@latest add tabs

# This will create:
# - components/ui/tabs.tsx
# And install dependencies if needed
```

Then import and use:

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

---

## Dependencies

RNR components rely on:

```json
{
  "dependencies": {
    "@rn-primitives/*": "latest",  // Core primitives
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1"
  }
}
```

Install peer dependencies as needed when adding components.

---

## Theme Configuration

RNR components use CSS variables defined in `global.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    /* ... more tokens */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode tokens */
  }
}
```

Components reference these with HSL values:
- `bg-background` → `hsl(var(--background))`
- `text-primary` → `hsl(var(--primary))`

---

## Portal Provider

Some components (Dialog, Popover, DropdownMenu, Toast) require a Portal provider in your root layout:

```tsx
// app/_layout.tsx
import { PortalProvider } from '@rn-primitives/portal';

export default function RootLayout() {
  return (
    <PortalProvider>
      {/* ... rest of your app */}
    </PortalProvider>
  );
}
```

---

## Best Practices

1. **Use CLI for adding components** - Ensures proper dependency resolution
2. **Customize in your codebase** - Edit components directly in `components/ui/`
3. **Check existing components first** - Don't add duplicates
4. **Use CVA for variants** - Follow the existing pattern
5. **Platform-specific styles** - Use `ios:`, `android:`, `native:` prefixes
6. **Dark mode** - Test with `dark:` prefixed classes

---

## References

- Official Docs: https://reactnativereusables.com/
- GitHub: https://github.com/founded-labs/react-native-reusables
- @rn-primitives: https://github.com/founded-labs/rn-primitives
- Uniwind Guide: See `docs/UNIWIND.md`
