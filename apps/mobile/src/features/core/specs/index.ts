// apps/mobile/src/features/core/specs/index.ts
// Re-export bridge types and errors
export * from './core/types';
export * from './core/errors';

// Note: CoreClient.nitro.ts is in ../../../generate/ and is used for Nitrogen codegen only
// The actual runtime implementation is in native-core-client.native.ts
