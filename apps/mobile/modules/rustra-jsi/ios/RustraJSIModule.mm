#import <React/RCTBridgeModule.h>
#import <React/RCTLog.h>
#import <ReactCommon/CallInvoker.h>
#import <ReactCommon/RCTTurboModule.h>
#import <ReactCommon/RCTTurboModuleWithJSIBindings.h>
#import <ReactCommon/RCTInteropTurboModule.h>
#import <jsi/jsi.h>

#include <exception>
#include <mutex>

#import "RustraJSIBridge.hpp"

// Expo SDK 57 (RN 0.86) runs bridgeless — `[RCTBridge currentBridge]` is nil
// there, so the install path must not depend on a bridge. Instead the module
// adopts RCTTurboModule (+ RCTTurboModuleWithJSIBindings): the manager only
// takes the TurboModule branch (where installJSIBindings is invoked) for
// classes conforming to RCTTurboModule — conformsToProtocol: is the
// classifier (RCTTurboModuleManager isTurboModuleClass). getTurboModule:
// returns an ObjCInteropTurboModule so the manager (a) wraps our
// RCT_EXPORT_METHOD `install` promise and (b) invokes
// installJSIBindingsWithRuntime right after.
@interface RustraJSI : NSObject <RCTBridgeModule, RCTTurboModule, RCTTurboModuleWithJSIBindings>
@end

@implementation RustraJSI {
  bool _didInstall;
  NSString *_Nullable _installError;
  std::mutex _mutex;
}

RCT_EXPORT_MODULE(RustraJSI)

// TurboModuleManager가 런타임 생성 시(리로드마다) 호출한다 — bridgeless에서도
// 동작한다. CallInvoker도 함께 주입되므로 이벤트 drain 마샬링에 쓴다.
- (void)installJSIBindingsWithRuntime:(facebook::jsi::Runtime &)runtime
                          callInvoker:(const std::shared_ptr<facebook::react::CallInvoker> &)callInvoker {
  if (!callInvoker) {
    RCTLogWarn(@"[RustraJSI] install skipped — CallInvoker is null");
    return;
  }
  auto typeErased = std::static_pointer_cast<void>(callInvoker);
  try {
    rustra::installRustraJSIWithInvoker(runtime, typeErased);
    std::lock_guard<std::mutex> lock(_mutex);
    _didInstall = true;
    _installError = nil;
    RCTLogInfo(@"[RustraJSI] JSI bindings installed successfully");
  } catch (const std::exception &exception) {
    std::lock_guard<std::mutex> lock(_mutex);
    _didInstall = false;
    _installError = [NSString stringWithUTF8String:exception.what()];
    RCTLogError(@"[RustraJSI] install failed: %@", _installError);
  } catch (...) {
    std::lock_guard<std::mutex> lock(_mutex);
    _didInstall = false;
    _installError = @"Unknown C++ error";
    RCTLogError(@"[RustraJSI] install failed: %@", _installError);
  }
}

// JS 진입점 — JSI 바인딩이 이미 떠 있는지 보고한다. 실제 설치는
// installJSIBindingsWithRuntime:가 담당하므로 이 메서드는 결과만 전달한다.
RCT_REMAP_METHOD(install,
                 installWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
  std::lock_guard<std::mutex> lock(_mutex);
  if (_didInstall) {
    resolve(@(YES));
  } else {
    reject(@"ERR_INSTALL",
           _installError ?: @"installJSIBindingsWithRuntime: was not called",
           nil);
  }
}

// interop 모듈로 감싸 RCT_EXPORT_METHOD(install)가 그대로 동작하게 하고,
// 매니저가 installJSIBindingsWithRuntime:을 호출하는 분기를 타게 한다.
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::ObjCInteropTurboModule>(params);
}

@end
