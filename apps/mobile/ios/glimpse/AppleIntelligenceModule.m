#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppleIntelligenceModule, NSObject)

RCT_EXTERN_METHOD(
  isAvailable:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  generate:(NSString *)prompt
  options:(NSDictionary *)options
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
