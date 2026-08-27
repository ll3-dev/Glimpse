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
  /// Dedicated key for URL shares (JSON-encoded WebUrl array). Text keeps the
  /// legacy sharedKey (String array); a dedicated key prevents the two kinds
  /// from clobbering each other when they differ in stored type.
  static let urlKey = "ll3.krShareUrlKey"

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

    // Read URL share (stored as JSON data). Falls back to the legacy shared
    // key for records written before the dedicated URL key existed.
    if let urlData = userDefaults?.data(forKey: Self.urlKey) ?? userDefaults?.data(forKey: Self.sharedKey),
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
    userDefaults?.removeObject(forKey: Self.urlKey)
    userDefaults?.removeObject(forKey: "\(Self.sharedKey)_directSave")
    userDefaults?.synchronize()
    resolve(nil)
  }

  /// Clears only the pending text record, keeping URL entries pending.
  @objc
  func clearPendingShareText(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let userDefaults = UserDefaults(suiteName: Self.appGroupIdentifier)
    // The text record lives under sharedKey as a String array; removing it
    // leaves the (separate) urlKey record untouched.
    if (userDefaults?.object(forKey: Self.sharedKey) != nil) {
      userDefaults?.removeObject(forKey: Self.sharedKey)
    }
    maybeClearDirectSaveFlag(userDefaults)
    userDefaults?.synchronize()
    resolve(nil)
  }

  /// Replaces the pending URL list with the given entries. Entries that the
  /// app saved are dropped; failed ones stay pending.
  @objc
  func replacePendingShareUrls(_ urls: NSArray, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let userDefaults = UserDefaults(suiteName: Self.appGroupIdentifier)

    guard let entries = urls as? [[String: Any]] else {
      reject("ERROR", "Invalid pending share URL payload", nil)
      return
    }

    if entries.isEmpty {
      userDefaults?.removeObject(forKey: Self.urlKey)
    } else {
      let webUrls = entries.compactMap { entry -> WebUrlData? in
        guard let url = entry["url"] as? String else { return nil }
        return WebUrlData(url: url, meta: entry["meta"] as? String ?? "")
      }
      guard let data = try? JSONEncoder().encode(webUrls) else {
        reject("ERROR", "Failed to encode pending share URLs", nil)
        return
      }
      userDefaults?.set(data, forKey: Self.urlKey)
    }
    maybeClearDirectSaveFlag(userDefaults)
    userDefaults?.synchronize()
    resolve(nil)
  }

  /// Drops the directSave flag once neither kind has a pending record left,
  /// so a stale flag does not make getPendingShareData report empty batches.
  private func maybeClearDirectSaveFlag(_ userDefaults: UserDefaults?) {
    let hasText = userDefaults?.object(forKey: Self.sharedKey) != nil
    let hasUrls = userDefaults?.object(forKey: Self.urlKey) != nil
    if !hasText && !hasUrls {
      userDefaults?.removeObject(forKey: "\(Self.sharedKey)_directSave")
    }
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
