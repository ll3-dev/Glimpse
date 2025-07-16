import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './ExpoLiveController.types';

type ExpoLiveControllerModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class ExpoLiveControllerModule extends NativeModule<ExpoLiveControllerModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(ExpoLiveControllerModule, 'ExpoLiveControllerModule');
