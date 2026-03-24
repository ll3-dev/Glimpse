import type { CSSProperties } from 'react';

export const styles = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top left, rgba(226, 232, 240, 0.9), rgba(248, 250, 252, 1) 35%, rgba(255, 255, 255, 1) 100%)',
    color: '#0f172a',
    fontFamily:
      '"SF Pro Display", "SF Pro Text", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: '32px 40px 48px',
  } satisfies CSSProperties,
  shell: {
    margin: '0 auto',
    maxWidth: '1100px',
  } satisfies CSSProperties,
  hero: {
    marginBottom: '24px',
  } satisfies CSSProperties,
  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(15, 23, 42, 0.06)',
    color: '#475569',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  } satisfies CSSProperties,
  title: {
    margin: '16px 0 10px',
    fontSize: '44px',
    lineHeight: 1.05,
    letterSpacing: '-0.03em',
  } satisfies CSSProperties,
  subtitle: {
    margin: 0,
    maxWidth: '760px',
    color: '#475569',
    fontSize: '16px',
    lineHeight: 1.7,
  } satisfies CSSProperties,
  card: {
    border: '1px solid rgba(148, 163, 184, 0.18)',
    borderRadius: '28px',
    background: 'rgba(255, 255, 255, 0.86)',
    boxShadow: '0 18px 60px rgba(15, 23, 42, 0.08)',
    backdropFilter: 'blur(16px)',
    padding: '28px',
  } satisfies CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '20px',
  } satisfies CSSProperties,
  column: {
    display: 'grid',
    gap: '20px',
  } satisfies CSSProperties,
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#64748b',
  } satisfies CSSProperties,
  runtimeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  } satisfies CSSProperties,
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    borderRadius: '999px',
    padding: '10px 14px',
    background: '#e2e8f0',
    color: '#0f172a',
    fontSize: '14px',
    fontWeight: 600,
  } satisfies CSSProperties,
  pillMuted: {
    background: '#f1f5f9',
    color: '#475569',
  } satisfies CSSProperties,
  modelCard: {
    borderRadius: '18px',
    background: '#f8fafc',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    padding: '18px',
    display: 'grid',
    gap: '8px',
  } satisfies CSSProperties,
  modelMeta: {
    margin: 0,
    color: '#475569',
    fontSize: '14px',
  } satisfies CSSProperties,
  statList: {
    display: 'grid',
    gap: '12px',
  } satisfies CSSProperties,
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
    fontSize: '14px',
  } satisfies CSSProperties,
  statLabel: {
    color: '#64748b',
  } satisfies CSSProperties,
  statValue: {
    fontWeight: 600,
    color: '#0f172a',
    textAlign: 'right',
  } satisfies CSSProperties,
  helper: {
    marginTop: '18px',
    color: '#475569',
    fontSize: '13px',
    lineHeight: 1.6,
  } satisfies CSSProperties,
  error: {
    marginTop: '12px',
    color: '#b91c1c',
    fontSize: '14px',
    fontWeight: 600,
  } satisfies CSSProperties,
} as const;
