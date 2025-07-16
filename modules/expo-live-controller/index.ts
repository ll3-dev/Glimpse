// Reexport the native module. On web, it will be resolved to ExpoLiveControllerModule.web.ts
// and on native platforms to ExpoLiveControllerModule.ts
export { LiveActivityNativeModule } from './src/ExpoLiveControllerModule';
export { default as ExpoLiveControllerView } from './src/ExpoLiveControllerView';
export * from './src/ExpoLiveController.types';
