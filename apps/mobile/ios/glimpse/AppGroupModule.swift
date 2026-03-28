import Foundation

/**
 * Native module to provide App Group container path for shared storage.
 * Used by both main app and share extension to access the same SQLite database.
 */
@objc(AppGroupModule)
class AppGroupModule: NSObject {
  /// The App Group identifier shared between main app and share extension
  static let appGroupIdentifier = "group.kr.ll3.glimpse"

  /// Returns the App Group container directory path
  @objc
  func getContainerPath(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    guard let containerURL = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: Self.appGroupIdentifier
    ) else {
      reject("ERROR", "Failed to get App Group container path", nil)
      return
    }
    resolve(containerURL.path)
  }

  /// Synchronous version for immediate access
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
