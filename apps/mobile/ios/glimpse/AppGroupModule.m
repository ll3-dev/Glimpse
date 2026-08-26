#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppGroupModule, NSObject)

RCT_EXTERN_METHOD(
  getContainerPath: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getPendingShareData: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  clearPendingShareData: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  clearPendingShareText: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  replacePendingShareUrls: (NSArray *)urls
  resolve: (RCTPromiseResolveBlock)resolve
  reject: (RCTPromiseRejectBlock)reject
)

@end
