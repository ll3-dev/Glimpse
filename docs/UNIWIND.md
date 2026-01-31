# Uniwind Reference

This project uses **Uniwind** - Tailwind CSS bindings for React Native with build-time compilation.

---

## CRITICAL: Build-Time Class Detection

Uniwind parses classNames at **build time**, not runtime. This is the most important thing to understand.

### ❌ NEVER Do This

```tsx
// Template literals with variables - WON'T WORK
<Text className={`text-${props.color}`} />

// String interpolation - WON'T WORK
<View className={`bg-${error ? 'red' : 'green'}-600`} />
```

### ✅ ALWAYS Do This Instead

```tsx
// Complete class names with ternary
<View className={error ? 'bg-red-600' : 'bg-green-600'} />

// Mapping object with complete class names
const colorVariants = {
  black: "bg-black text-white",
  blue: "bg-blue-500 text-white",
};
<Text className={colorVariants[props.color]} />
```

**When writing code, always ensure full class names are present in the source.**

---

## Platform Selectors

Apply different styles per platform:

```tsx
// Platform-specific styling
<View className="ios:bg-blue-500 android:bg-green-500 web:bg-purple-500">
  <Text className="native:text-black web:text-white">
    {/* native: = ios + android combined */}
  </Text>
</View>
```

| Prefix | Target |
|--------|--------|
| `ios:` | iOS only |
| `android:` | Android only |
| `web:` | Web only |
| `native:` | iOS + Android (mobile) |

---

## Responsive Breakpoints

Mobile-first system (min-width):

| Prefix | Min Width |
|--------|-----------|
| `sm`   | 640px     |
| `md`   | 768px     |
| `lg`   | 1024px    |
| `xl`   | 1280px    |
| `2xl`  | 1536px    |

```tsx
// Mobile: p-4, tablet+: p-6, desktop+: p-8
<View className="p-4 md:p-6 lg:p-8">
  <Text className="text-base md:text-lg lg:text-xl">Text</Text>
</View>
```

---

## Dark Mode

Use the `dark:` prefix:

```tsx
<View className="bg-white dark:bg-gray-900">
  <Text className="text-black dark:text-white">Theme aware</Text>
</View>
```

### Using light-dark() CSS Function

```css
/* In global.css */
@layer utilities {
  .bg-adaptive {
    background-color: light-dark(#ffffff, #1f2937);
  }
}
```

---

## Third-Party Components

Components from libraries don't support `className` by default. Wrap them:

```tsx
import { withUniwind } from 'uniwind';
import { SafeAreaView } from 'react-native-safe-area-context';

// Wrap once, reuse everywhere
const StyledSafeAreaView = withUniwind(SafeAreaView);

// Now you can use className
<StyledSafeAreaView className="flex-1 bg-background" />
```

### Color Props on Third-Party Components

For components with `color` props (not `style`), use `accent-` prefix:

```tsx
import { withUniwind } from 'uniwind';
import { ActivityIndicator } from 'react-native';

const StyledActivityIndicator = withUniwind(ActivityIndicator);

// For style prop: regular classes
// For color prop: accent- prefix
<StyledActivityIndicator
  className="m-4"
  colorClassName="accent-blue-500"
/>
```

---

## API Hooks

### useUniwind() - Get Current Theme

```tsx
import { useUniwind } from 'uniwind';

const { theme, hasAdaptiveThemes } = useUniwind();
// theme: "light" | "dark" | custom theme name
// hasAdaptiveThemes: boolean
```

### useCSSVariable() - Access CSS Variables in JS

```tsx
import { useCSSVariable } from 'uniwind';

// Single
const primaryColor = useCSSVariable('--color-primary');

// Multiple (more efficient - single subscription)
const [color, spacing] = useCSSVariable([
  '--color-primary',
  '--spacing-4'
]);
```

**Note:** Variables must be used in a className somewhere in your app, or defined in `@theme static` block.

### useResolveClassNames() - Convert to Style Object

```tsx
import { useResolveClassNames } from 'uniwind';

const styles = useResolveClassNames('bg-red-500 p-4');
<View style={styles} />

// Use case: react-navigation themes
const headerStyle = useResolveClassNames('bg-blue-500');
```

**Use sparingly** - prefer `className` prop when possible.

---

## Complex Component Variants

For components with multiple style variants, use `tailwind-variants`:

```tsx
import { tv } from 'tailwind-variants';

const button = tv({
  base: 'font-semibold rounded-lg px-4 py-2',
  variants: {
    color: {
      primary: 'bg-blue-500 text-white',
      secondary: 'bg-gray-500 text-white',
    },
    size: {
      sm: 'text-sm',
      lg: 'text-lg',
    },
  },
  compoundVariants: [
    { color: 'primary', size: 'lg', class: 'bg-blue-600' },
  ],
  defaultVariants: {
    color: 'primary',
    size: 'sm',
  },
});

// Usage
<Pressable className={button({ color: 'primary', size: 'lg' })}>
  <Text>Click</Text>
</Pressable>
```

---

## Custom CSS Classes

You can write regular CSS alongside Tailwind:

```css
/* global.css */
.card {
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

```tsx
// Use alongside Tailwind
<View className="card p-4">
  <Text>Combined CSS + Tailwind</Text>
</View>
```

---

## CSS Functions (Device-Specific)

Define in `@layer utilities`:

```css
@layer utilities {
  /* Thinnest visible line on device */
  .h-hairline {
    height: hairlineWidth();
  }

  /* Scales with user's font size setting */
  .text-scaled {
    font-size: fontScale();
  }

  /* Multiplies by device pixel ratio */
  .w-avatar {
    width: calc(pixelRatio() * 2);
  }
}
```

---

## What's Supported vs Not Supported

### ✅ Supported

- All standard Tailwind utilities (layout, spacing, colors, typography, borders, flexbox, transforms)
- Platform selectors (`ios:`, `android:`, `web:`, `native:`)
- Responsive breakpoints (`sm:`, `md:`, `lg:`, etc.)
- Dark mode (`dark:`)
- Custom CSS classes

### ❌ Not Supported (Web-Specific)

- `hover:*`, `visited:*` - use Pressable states instead
- `before:*`, `after:*`, `placeholder:*` - pseudo-elements
- `float:*`, `clear:*` - not applicable to React Native
- `grid:*` - Yoga layout engine doesn't support CSS Grid

---

## Key Differences from Web CSS

| Web CSS | React Native (Uniwind) |
|---------|------------------------|
| Cascade/inheritance | No cascade - styles don't inherit |
| `display: block` | Flexbox by default (`flexDirection: 'column'`) |
| `em`, `rem` units | Different unit handling |
| `:hover` pseudo-class | Use Pressable state callbacks |

---

## Project Configuration Reference

### metro.config.js

```js
const { withUniwindConfig } = require('uniwind/metro');

module.exports = withUniwindConfig(config, {
  cssEntryFile: './app/global.css',  // Where Tailwind scans for classNames
  extraThemes: ['ocean', 'sunset'],   // Custom theme names
  dtsFile: './uniwind-types.d.ts',    // TypeScript defs location
  debug: true,                        // Log unsupported CSS
});
```

### global.css Structure

```css
@import 'tailwindcss';
@import 'uniwind';

/* Custom themes */
@layer theme {
  :root {
    @variant ocean {
      --color-background: #0c4a6e;
      --color-foreground: #e0f2fe;
    }
  }
}

/* Custom utilities */
@layer utilities {
  .my-custom-class {
    /* styles */
  }
}

/* Static theme for JS-accessible variables */
@theme static {
  --chart-line-width: 2;
}
```

---

## Common Patterns

### Conditional Styling

```tsx
// ✅ Good - complete class names
<View className={isActive ? 'bg-blue-500' : 'bg-gray-500'} />

// ❌ Bad - dynamic construction
<View className={`bg-${isActive ? 'blue' : 'gray'}-500`} />
```

### Platform-Specific Component

```tsx
<View className="ios:p-4 android:p-2">
  <Text className="ios:text-base android:text-sm">
    Platform-aware text
  </Text>
</View>
```

### Third-Party Library Component

```tsx
// Wrap once at module level
export const StyledSafeAreaView = withUniwind(SafeAreaView);

// Use anywhere
<StyledSafeAreaView className="flex-1">
  <Text className="p-4">Content</Text>
</StyledSafeAreaView>
```

### Theme-Aware Color for Charts

```tsx
import { useCSSVariable } from 'uniwind';

const Chart = () => {
  const [primaryColor, backgroundColor] = useCSSVariable([
    '--color-primary',
    '--color-background'
  ]);

  return <SomeChartLibrary colors={[primaryColor]} bg={backgroundColor} />;
};
```
