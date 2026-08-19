Pod::Spec.new do |s|
  s.name         = "RustraJSI"
  s.version      = "1.0.0"
  s.summary      = "Rustra JSI bridge over glimpse-bridge for Glimpse"
  s.homepage     = "https://github.com/ll3/Glimpse"
  s.license      = "UNLICENSED"
  s.authors      = "ll3"

  s.platform     = :ios, "15.1"
  s.source       = { :path => "." }

  s.source_files = "*.{h,hpp,cpp,mm}"

  s.dependency "React-jsi"
  s.dependency "React-Core"
  # jsCallInvoker 접근자(RCTBridge (RCTTurboModule) 카테고리) — 이벤트 푸시
  # drain을 JS 스레드로 마샬링하는 CallInvoker를 얻는다.
  s.dependency "React-NativeModulesApple"

  s.static_framework = true

  # Static Rust archive with the rustra_ffi_* / glimpse_ffi_init symbols.
  # -force_load is required because nothing references these object files by
  # name — the JSI bridge only declares externs — so the linker would skip
  # them entirely. We link the xcframework slices directly from the app
  # target (device / simulator) via platform-conditioned flags rather than
  # vendored_frameworks, because the path escapes the pod root and
  # CocoaPods then skips the [CP] Copy XCFrameworks staging phase.
  bridge = "${PODS_ROOT}/../Frameworks/GlimpseBridge.xcframework"
  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20"
  }
  s.user_target_xcconfig = {
    "OTHER_LDFLAGS[sdk=iphoneos*]" => "$(inherited) -force_load #{bridge}/ios-arm64/libglimpse_bridge.a",
    "OTHER_LDFLAGS[sdk=iphonesimulator*]" => "$(inherited) -force_load #{bridge}/ios-arm64_x86_64-simulator/libglimpse_bridge.a"
  }
end
