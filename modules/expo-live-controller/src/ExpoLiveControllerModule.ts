import { requireNativeModule } from 'expo';

import { Platform } from 'react-native';
import { StartLiveActivityFn, StopLiveActivityFn } from './ExpoLiveController.types';

const nativeModule = Platform.OS === 'android' ? null : requireNativeModule<
  {
    start: StartLiveActivityFn,
    stop: StopLiveActivityFn,
  }
>('ExpoLiveController');

export const LiveActivityNativeModule = nativeModule ? nativeModule : {
  start: (data: string) => ({
    isSuccess: false,
  }),
  stop: (id: string) => ({
    isSuccess: false,
  }),
}
