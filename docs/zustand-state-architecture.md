# Zustand State Architecture

## Goal
Use `zustand` as the shared state layer for app-level mutable state, while keeping:
- server/data fetching in `@tanstack/react-query`
- screen-only ephemeral values in local `useState` / `useReducer`

This keeps refactors smaller by separating:
- domain logic (`src/features/*`)
- shared state storage (`src/stores/*`)
- UI rendering (`app/*`, `src/components/*`)

## Current Shared State Map

| Domain | Store Access Point | Feature Service |
| --- | --- | --- |
| BYOK config | `src/stores/settings/byok.store.ts` | `src/features/settings/byokSettings.ts` |
| Apple Intelligence toggle | `src/stores/settings/appleIntelligence.store.ts` | `src/features/settings/appleIntelligenceToggle.ts` |
| Recommendation cadence | `src/stores/recommendation/cadence.store.ts` | `src/features/recommendation/updateRecommendationCadence.ts` |

## Structure Rules

1. Keep store modules in `src/stores/<domain>/*` and domain rules in `src/features/<domain>/*`.
2. Expose two APIs from feature state modules:
   - imperative functions for non-React/domain usage (`get*`, `set*`, `enable*`, ...)
   - selector hooks for React usage (`use*`)
3. Keep UI free of duplicated shadow state for shared values.
   - Screens should read shared state via selector hooks.
4. Keep validation/business rules in feature functions, not inside components.
5. If state must survive app restart, add a persistence layer explicitly (SecureStore/Keychain/SQLite), not ad-hoc globals.

## Decision Guide

Use local state (`useState`/`useReducer`) when:
- value is only needed by one screen/component
- value can reset on unmount safely

Use `zustand` when:
- value is shared across screens/features
- value is app-session level state
- replacing module globals will reduce coupling

Use `react-query` when:
- value is server/database sourced cache
- invalidation/refetch semantics are needed

## Implementation Template

```ts
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

type FeatureState = {
  value: string;
};

const featureStore = createStore<FeatureState>(() => ({
  value: '',
}));

export function getValue(): string {
  return featureStore.getState().value;
}

export function setValue(next: string): void {
  featureStore.setState({ value: next });
}

export function useValue(): string {
  return useStore(featureStore, (state) => state.value);
}
```

## Practical Workflow For New Shared State

1. Define state shape/defaults in `src/stores/<domain>`.
2. Create zustand store (`createStore`) in `src/stores/<domain>`.
3. Keep validation/rules in `src/features/<domain>` and call store helpers there.
4. Add selector hooks used by screens/components (either from store directly or feature facade).
5. Replace duplicated local copies in UI with selector hooks.
6. Add/adjust tests to validate behavior after state transitions.

## Existing References

- `app/settings.tsx`
- `src/stores/settings/byok.store.ts`
- `src/stores/settings/appleIntelligence.store.ts`
- `src/stores/recommendation/cadence.store.ts`
- `src/features/settings/byokSettings.ts`
- `src/features/settings/appleIntelligenceToggle.ts`
- `src/features/recommendation/updateRecommendationCadence.ts`
