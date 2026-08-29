import { useCSSVariable } from 'uniwind';

export type SemanticColorName =
  | 'appBg'
  | 'appSurface'
  | 'appCard'
  | 'appBorder'
  | 'appText'
  | 'appMuted'
  | 'appSubtle'
  | 'appPrimary'
  | 'appAccent'
  | 'primaryForeground'
  | 'tagMintText'
  | 'tagPeachText'
  | 'tagSkyText'
  | 'tagLavenderText'
  | 'tagRoseText'
  | 'tagNeutralText';

const CSS_VARIABLES: Record<SemanticColorName, string> = {
  appBg: '--color-app-bg',
  appSurface: '--color-app-surface',
  appCard: '--color-app-card',
  appBorder: '--color-app-border',
  appText: '--color-app-text',
  appMuted: '--color-app-muted',
  appSubtle: '--color-app-subtle',
  appPrimary: '--color-app-primary',
  appAccent: '--color-app-accent',
  primaryForeground: '--color-primary-foreground',
  tagMintText: '--color-tag-mint-text',
  tagPeachText: '--color-tag-peach-text',
  tagSkyText: '--color-tag-sky-text',
  tagLavenderText: '--color-tag-lavender-text',
  tagRoseText: '--color-tag-rose-text',
  tagNeutralText: '--color-tag-neutral-text',
};

// Native CSS variables are available after Uniwind initializes. Keeping the
// fallback beside the semantic mapping avoids leaking palette values into UI.
const FALLBACKS: Record<SemanticColorName, string> = {
  appBg: '#f7f6f3',
  appSurface: '#ffffff',
  appCard: '#ffffff',
  appBorder: '#edece9',
  appText: '#37352f',
  appMuted: '#787774',
  appSubtle: '#9b9a97',
  appPrimary: '#2383e2',
  appAccent: '#eb5757',
  primaryForeground: '#ffffff',
  tagMintText: '#1a7f37',
  tagPeachText: '#a04100',
  tagSkyText: '#0969da',
  tagLavenderText: '#6e3ab7',
  tagRoseText: '#cf222e',
  tagNeutralText: '#787774',
};

export function useSemanticColor(name: SemanticColorName): string {
  const value = useCSSVariable(CSS_VARIABLES[name]);
  return typeof value === 'string' ? value : FALLBACKS[name];
}
