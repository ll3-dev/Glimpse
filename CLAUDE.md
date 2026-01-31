# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Glimpse is a React Native mobile app (iOS/Android) built with Expo that helps users capture, organize, and revisit their thoughts through widgets. The app uses Expo Router for file-based routing, NativeWind (Tailwind CSS for React Native) for styling, and expo-sqlite with Drizzle ORM for local data persistence.

## Development Commands

```bash
# Install dependencies (also runs NativeWind postinstall)
npm install

# Start development server (opens in Expo Go or dev build)
npx expo start

# Run on specific platform
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # Web browser

# Lint code
npm run lint

# Generate database migrations (after schema changes)
npx drizzle-kit generate

# Open Drizzle Studio to inspect database
npx expo drizzle
```

## Architecture

### Tech Stack
- **Framework**: Expo 53 with React Native 0.79.5 (New Architecture enabled)
- **Routing**: expo-router (file-based routing in `app/` directory)
- **Styling**: NativeWind 4 with Tailwind CSS (CSS variables for theming)
- **State Management**: Zustand for global state, TanStack Query for server-like state
- **Database**: expo-sqlite + Drizzle ORM (migrations run on app startup)
- **UI Components**: Custom components in `components/ui/` (shadcn-style) and `@rn-primitives`

### Directory Structure
- `app/` - Expo Router pages (file-based routing)
- `components/` - Reusable React components organized by feature
- `db/` - Database schema and connection (Drizzle ORM)
- `hooks/` - Custom React hooks, including database queries/mutations in `hooks/db/`
- `store/` - Zustand global state stores
- `lib/` - Utility functions, constants, and platform-specific code
- `modules/glimpse-native-bridges/` - Expo native module for iOS/Android interop
- `targets/widget/` - iOS widget extension code (Swift)
- `drizzle/` - Database migrations

### App Data Flow
1. **Database**: Local SQLite database with Drizzle ORM
   - `glintTable`: Main content entries (title, content, importance, timestamps)
   - `tagsTable`: Tags for categorization
   - `glintTagsTable`: Many-to-many relationship between glints and tags
2. **Queries**: TanStack Query hooks in `hooks/db/` fetch data from the database
3. **Migrations**: Automatically run on app startup via `useMigrations` in `app/_layout.tsx`
4. **Widget Integration**: Background tasks update widget data via `glimpseNativeBridges.set()` which writes to shared UserDefaults (App Group: `group.glimpse.data`)

### iOS Widget Extension
- Located in `targets/widget/` (Swift code)
- Reads from shared UserDefaults using App Group `group.glimpse.data`
- Widget displays glint titles rotated on 15-minute intervals
- Uses `@bacons/apple-targets` Expo plugin for configuration

### Key Integration Points
- **Native Module**: `modules/glimpse-native-bridges/` provides bridge to iOS/Android native code
- **Background Tasks**: Registered via expo-background-task and expo-task-manager
- **Theming**: CSS variables in `global.css` for light/dark mode support

## Styling Conventions
- Use NativeWind class names (Tailwind CSS syntax)
- Colors use HSL CSS variables: `bg-background`, `text-foreground`, `border-border`, etc.
- Platform-specific code uses `Platform.select()` or separate files with `.ios`/`.android` extensions

## Path Aliases
- `@/*` maps to project root (configured in `tsconfig.json`)
