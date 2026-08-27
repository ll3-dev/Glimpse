Pod::Spec.new do |s|
  s.name         = "SyncDiscoveryModule"
  s.version      = "1.0.0"
  s.summary      = "Bonjour discovery for Glimpse sync"
  s.homepage     = "https://github.com/ll3/Glimpse"
  s.license      = "UNLICENSED"
  s.authors      = "ll3"

  s.platform     = :ios, "15.1"
  s.source       = { :path => "." }
  s.source_files = "*.swift"

  s.dependency "ExpoModulesCore"
end
