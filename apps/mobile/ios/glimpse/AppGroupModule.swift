import Foundation

/**
 * Native module to provide App Group container path for shared storage.
 * Used by both main app and share extension to access the same SQLite database.
 */
@objc(AppGroupModule)
class AppGroupModule: NSObject {
  /// The App Group identifier shared between main app and share extension
  static let appGroupIdentifier = "group.kr.ll3.glimpse"
  static let sharedKey = "ll3.krShareKey"

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

  /// Reads pending share data saved by Share Extension (direct save mode)
  @objc
  func getPendingShareData(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let userDefaults = UserDefaults(suiteName: Self.appGroupIdentifier)

    let hasDirectSave = userDefaults?.bool(forKey: "\(Self.sharedKey)_directSave") ?? false
    guard hasDirectSave else {
      resolve(nil)
      return
    }

    var result: [String: Any?] = [:]

    // Read text share
    if let textArray = userDefaults?.stringArray(forKey: Self.sharedKey) {
      result["text"] = textArray
    }

    // Read URL share (stored as JSON data)
    if let urlData = userDefaults?.data(forKey: Self.sharedKey),
       let urlArray = try? JSONDecoder().decode([WebUrlData].self, from: urlData) {
      result["webUrl"] = urlArray.map { ["url": $0.url, "meta": $0.meta] }
    }

    resolve(result.isEmpty ? nil : result)
  }

  /// Clears pending share data after processing
  @objc
  func clearPendingShareData(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let userDefaults = UserDefaults(suiteName: Self.appGroupIdentifier)
    userDefaults?.removeObject(forKey: Self.sharedKey)
    userDefaults?.removeObject(forKey: "\(Self.sharedKey)_directSave")
    userDefaults?.synchronize()
    resolve(nil)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}

/// Helper struct for decoding WebUrl data from UserDefaults
private struct WebUrlData: Codable {
  let url: String
  let meta: String
}
