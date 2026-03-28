#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppGroupModule, NSObject)

RCT_EXTERN_METHOD(
  getContainerPath: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

@end
