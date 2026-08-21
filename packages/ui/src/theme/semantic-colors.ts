import { useCSSVariable } from 'uniwind';

export type SemanticColorName =
  | 'appBg'
  | 'appSurface'
  | 'appBorder'
  | 'appText'
  | 'appMuted'
  | 'appSubtle'
  | 'appPrimary'
  | 'appAccent'
  | 'primaryForeground'
  | 'tagMintText'
  | 'tagPeachText'
  | 'tagLavenderText'
  | 'tagRoseText';

const CSS_VARIABLES: Record<SemanticColorName, string> = {
  appBg: '--color-app-bg',
  appSurface: '--color-app-surface',
  appBorder: '--color-app-border',
  appText: '--color-app-text',
  appMuted: '--color-app-muted',
  appSubtle: '--color-app-subtle',
  appPrimary: '--color-app-primary',
  appAccent: '--color-app-accent',
  primaryForeground: '--color-primary-foreground',
  tagMintText: '--color-tag-mint-text',
  tagPeachText: '--color-tag-peach-text',
  tagLavenderText: '--color-tag-lavender-text',
  tagRoseText: '--color-tag-rose-text',
};

// Native CSS variables are available after Uniwind initializes. Keeping the
// fallback beside the semantic mapping avoids leaking palette values into UI.
const FALLBACKS: Record<SemanticColorName, string> = {
  appBg: '#f7f6f3',
  appSurface: '#ffffff',
  appBorder: '#edece9',
  appText: '#37352f',
  appMuted: '#787774',
  appSubtle: '#9b9a97',
  appPrimary: '#2383e2',
  appAccent: '#eb5757',
  primaryForeground: '#ffffff',
  tagMintText: '#1a7f37',
  tagPeachText: '#a04100',
  tagLavenderText: '#6e3ab7',
  tagRoseText: '#cf222e',
};

export function useSemanticColor(name: SemanticColorName): string {
  const value = useCSSVariable(CSS_VARIABLES[name]);
  return typeof value === 'string' ? value : FALLBACKS[name];
}
