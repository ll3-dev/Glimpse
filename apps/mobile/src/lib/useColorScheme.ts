import { useUniwind } from 'uniwind';
import {
  useThemePreference,
  useThemePreferenceActions,
} from '@/src/stores/settings/theme.store';

/**
 * 테마 상태·변경의 단일 창구. uniwind가 활성 테마(currentTheme, system 추종
 * 포함)를 제공하고, preference 저장/적용은 theme.store에 위임한다.
 *
 * 반환 시그니처(기존 스텁 호환):
 * - colorScheme / isDarkColorScheme: 현재 활성 테마 (system 선택 시 OS를 따라감)
 * - themePreference / setColorScheme: 저장된 preference와 그 변경
 * - toggleColorScheme: 활성 테마 기준 light/dark 토글 (preference를 고정)
 */
export function useColorScheme() {
  const { theme } = useUniwind();
  const preference = useThemePreference((value) => value);
  const { setPreference } = useThemePreferenceActions();

  const colorScheme = theme === 'dark' ? ('dark' as const) : ('light' as const);

  return {
    colorScheme,
    isDarkColorScheme: colorScheme === 'dark',
    themePreference: preference,
    setColorScheme: setPreference,
    toggleColorScheme: () => setPreference(colorScheme === 'dark' ? 'light' : 'dark'),
  };
}
