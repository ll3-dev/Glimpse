import * as React from 'react';

import { ExpoLiveControllerViewProps } from './ExpoLiveController.types';

export default function ExpoLiveControllerView(props: ExpoLiveControllerViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
