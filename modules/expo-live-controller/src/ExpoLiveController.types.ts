import type { StyleProp, ViewStyle } from 'react-native';

export type OnLoadEventPayload = {
  url: string;
};

export type ExpoLiveControllerModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
};

export type ChangeEventPayload = {
  value: string;
};

export type ExpoLiveControllerViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
  style?: StyleProp<ViewStyle>;
};

type BaseActivityResponse = {
  isSuccess: boolean;
  message?: string;
};

export type ActivityStartResponse = {
  id?: string;
} & BaseActivityResponse;

export type ActivityStopResponse = {
  id?: string;
} & BaseActivityResponse;

export type StartLiveActivityFn = (data: string) => Promise<ActivityStartResponse>;

export type StopLiveActivityFn = (id: string) => Promise<ActivityStopResponse>;
