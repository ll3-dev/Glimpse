import { requireNativeView } from 'expo';
import * as React from 'react';

import { ExpoLiveControllerViewProps } from './ExpoLiveController.types';

const NativeView: React.ComponentType<ExpoLiveControllerViewProps> =
  requireNativeView('ExpoLiveController');

export default function ExpoLiveControllerView(props: ExpoLiveControllerViewProps) {
  return <NativeView {...props} />;
}
