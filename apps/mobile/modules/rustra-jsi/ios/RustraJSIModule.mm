#import <React/RCTBridge+Private.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTLog.h>
#import <ReactCommon/CallInvoker.h>
#import <ReactCommon/RCTTurboModule.h>
#import <jsi/jsi.h>

#include <exception>

#import "RustraJSIBridge.hpp"

@interface RustraJSI : NSObject <RCTBridgeModule>
@end

@implementation RustraJSI

RCT_EXPORT_MODULE(RustraJSI)

RCT_REMAP_METHOD(install,
                  installWithResolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  @try {
    // In new arch, self.bridge may not be set.
    // Get the bridge through the RN shared infrastructure.
    RCTBridge *bridge = [RCTBridge currentBridge];
    if (!bridge) {
      reject(@"ERR_NO_BRIDGE", @"[RCTBridge currentBridge] returned nil", nil);
      return;
    }

    // JS 스레드 CallInvoker — 이벤트 푸시 drain을 JS 런타임 스레드로 마샬링.
    // RCTTurboModule 카테고리(RCTBridge (RCTTurboModule))의 jsCallInvoker 접근자는
    // RCTCxxBridge 구현이 제공한다 — shared_ptr<CallInvoker>를 값으로 반환한다.
    RCTCxxBridge *cxxBridge = (RCTCxxBridge *)bridge;
    std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker =
        [cxxBridge jsCallInvoker];
    if (!jsCallInvoker) {
      reject(@"ERR_NO_CALL_INVOKER", @"JS CallInvoker is unavailable", nil);
      return;
    }

    // TurboModule 메서드는 com.meta.react.turbomodulemanager.queue에서 호출될
    // 수 있다. 그 큐에서 jsi::Runtime을 직접 건드리면 Hermes GC와 경합해
    // 힙이 손상되므로 설치 전체를 JS 런타임 스레드로 마샬링한다.
    auto typeErasedCallInvoker =
        std::static_pointer_cast<void>(jsCallInvoker);
    RCTPromiseResolveBlock resolveBlock = [resolve copy];
    RCTPromiseRejectBlock rejectBlock = [reject copy];
    jsCallInvoker->invokeAsync(
        [typeErasedCallInvoker = std::move(typeErasedCallInvoker),
         resolveBlock,
         rejectBlock](facebook::jsi::Runtime& runtime) {
          @try {
            try {
              rustra::installRustraJSIWithInvoker(
                  runtime, typeErasedCallInvoker);
              RCTLogInfo(@"[RustraJSI] JSI bindings installed successfully");
              resolveBlock(@(YES));
            } catch (const std::exception& exception) {
              NSString *message = [NSString stringWithUTF8String:exception.what()];
              rejectBlock(@"ERR_INSTALL", message ?: @"Unknown C++ error", nil);
            } catch (...) {
              rejectBlock(@"ERR_INSTALL", @"Unknown C++ error", nil);
            }
          } @catch (NSException *exception) {
            rejectBlock(@"ERR_INSTALL",
                        exception.reason ?: @"Unknown Objective-C error",
                        nil);
          }
        });
  } @catch (NSException *exception) {
    reject(@"ERR_INSTALL", exception.reason ?: @"Unknown error", nil);
  }
}

@end
