import { onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import "@/src/features/labeling/background-task";
// 저장된 테마 preference를 첫 프레임 전에 적용해 다크 모드 플래시를 막는다.
import { ensureThemeHydrated } from "@/src/stores/settings/theme.store";

onlineManager.setEventListener((setOnline) => {
  const eventSubscription = Network.addNetworkStateListener((state) => {
    setOnline(!!state.isConnected);
  });
  return eventSubscription.remove;
});

ensureThemeHydrated();

// react-native-calendars(LocaleConfig 한국어 설정 포함)는 사용하는 화면이
// 없다 — 앱 첫 모듈인 이 파일이 라이브러리 전체를 파싱해 콜드스타트를
// 늦추지 않도록 제거했다. 나중에 캘린더를 쓰면 해당 화면에서만 require.