import { LocaleConfig } from 'react-native-calendars';
import { ensureThemeHydrated } from '@/src/stores/settings/theme.store';

// Native initialization registers background tasks and expo-network listeners.
// Both touch browser globals during SSR, so the web entry keeps initialization
// side-effect free until React mounts in the browser. Theme hydration only
// reads MMKV and applies the saved preference (uniwind's web path guards the
// native Appearance calls), so it is safe to run here like on native.
ensureThemeHydrated();
LocaleConfig.locales.ko = {
  monthNames: [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ],
  monthNamesShort: [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';
