require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "GlimpseCore"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"] || "https://github.com/ll3/glimpse"
  s.license      = "UNLICENSED"
  s.authors      = "ll3"

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/ll3/glimpse.git", :tag => "#{s.version}" }

  s.source_files = ["ios/**/*.{m,mm,cc,cpp}", "cpp/**/*.{hpp,cpp}"]
  s.preserve_paths = ["ios/framework/libglimpsecore.xcframework/**/*"]
  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => [
      '"${PODS_TARGET_SRCROOT}/cpp"',
      '"${PODS_TARGET_SRCROOT}/ios/include"',
      '"$(PODS_ROOT)/react-native-nitro-modules/ios"',
      '"$(PODS_ROOT)/Headers/Public/react-native-nitro-modules"',
    ].join(' '),
    "LIBRARY_SEARCH_PATHS[sdk=iphoneos*]" => '"${PODS_TARGET_SRCROOT}/ios/framework/libglimpsecore.xcframework/ios-arm64"',
    "LIBRARY_SEARCH_PATHS[sdk=iphonesimulator*]" => '"${PODS_TARGET_SRCROOT}/ios/framework/libglimpsecore.xcframework/ios-arm64_x86_64-simulator"',
    "OTHER_LDFLAGS" => '$(inherited) -lglimpsecore-prebuilt',
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
  }
  s.user_target_xcconfig = {
    "LIBRARY_SEARCH_PATHS[sdk=iphoneos*]" => '"${PODS_ROOT}/../../modules/glimpse-core/ios/framework/libglimpsecore.xcframework/ios-arm64"',
    "LIBRARY_SEARCH_PATHS[sdk=iphonesimulator*]" => '"${PODS_ROOT}/../../modules/glimpse-core/ios/framework/libglimpsecore.xcframework/ios-arm64_x86_64-simulator"',
    "OTHER_LDFLAGS" => '$(inherited) -lglimpsecore-prebuilt',
  }

  s.dependency "NitroModules"
  install_modules_dependencies(s)
end
