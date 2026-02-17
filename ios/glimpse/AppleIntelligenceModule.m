//
//  AppleIntelligenceModule.m
//  glimpse
//
//  React Native bridge for AppleIntelligenceModule
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppleIntelligenceModule, NSObject)

/// Check if Apple Intelligence is available
/// Returns a status code via Promise:
/// - 0: available
/// - 1: unsupported_os
/// - 2: unsupported_device
/// - 3: disabled
/// - 4: not_configured
RCT_EXTERN_METHOD(
  isAvailable:
  (RCTPromiseResolveBlock)resolve
)

/// Generate text using Apple Intelligence
/// @param prompt - The input prompt
/// @param options - Dictionary with maxTokens, temperature
/// @param resolve - Returns { text: string }
/// @param reject - Returns (code, message, error)
RCT_EXTERN_METHOD(
  generate:
  (NSString *)prompt
  options:(NSDictionary *)options
  resolve:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

@end
