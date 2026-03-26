require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "GlimpseCore"
  s.version      = package["version"]
  s.summary      = "Rust-backed Nitro bridge for Glimpse core"
  s.homepage     = "https://github.com/ll3/Glimpse"
  s.license      = "UNLICENSED"
  s.authors      = "ll3"

  s.platform     = :ios, "15.1"
  s.source       = { :path => "." }

  s.source_files = [
    "nitrogen/generated/shared/**/*.{h,hpp,c,cpp,swift}",
    "nitrogen/generated/ios/**/*.{h,hpp,c,cpp,mm,swift}"
  ]

  s.dependency "React-Core"
  s.dependency "NitroModules"

  s.vendored_frameworks = "ios/Frameworks/GlimpseCore.xcframework"

  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => [
      "\"$(PODS_ROOT)/react-native-nitro-modules/ios\"",
      "\"$(PODS_ROOT)/Headers/Public/react-native-nitro-modules\"",
      "\"$(PODS_TARGET_SRCROOT)/nitrogen/generated/shared/c++\"",
      "\"$(PODS_TARGET_SRCROOT)/nitrogen/generated/shared\"",
      "\"$(PODS_TARGET_SRCROOT)/nitrogen/generated/ios/c++\"",
      "\"$(PODS_TARGET_SRCROOT)/nitrogen/generated/ios\""
    ],
    "OTHER_SWIFT_FLAGS" => "-cxx-interoperability-mode=default",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20"
  }

  load "nitrogen/generated/ios/GlimpseCore+autolinking.rb"
  add_nitrogen_files(s)
end
