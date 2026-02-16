// Re-export form state from features
export {
  useCollectFormState,
  type BuildSaveInputResult,
  type CollectFormActions,
  type CollectFormState,
} from '@/src/features/capture';

// Note: SharedContent type is available from '@/src/features/capture'

// UI Components
export * from './CollectForm';
export * from './CollectChannelForm';
export * from './CollectSaveButton';
export * from './ChannelSegment';
export * from './HighlightForm';
export * from './ScreenshotForm';
export * from './ShareForm';
export * from './ScreenshotStub';
export * from './ShareStub';
