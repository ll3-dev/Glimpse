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
  /// Pending Shortcuts image captures: filenames (no directory) of files under
  /// `pendingImagesDirectory` in the App Group container. The share extension
  /// writes images through the JS side; Shortcuts writes them via the intent.
  static let imageKey = "ll3.krShareImageKey"
  static let pendingImagesDirectory = "PendingShareImages"

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

    // Read pending image captures (Shortcuts). Files that no longer exist are
    // dropped here so a deleted file never wedges the batch as permanently failing.
    let imagePaths = Self.pendingImagePaths(userDefaults)
    if !imagePaths.isEmpty {
      result["imagePaths"] = imagePaths
    }

    resolve(result.isEmpty ? nil : result)
  }

  /// Absolute paths of pending image files that actually exist on disk.
  private static func pendingImagePaths(_ userDefaults: UserDefaults?) -> [String] {
    let filenames = userDefaults?.stringArray(forKey: Self.imageKey) ?? []
    guard !filenames.isEmpty,
          let directory = Self.pendingImagesDirectoryURL() else { return [] }
    return filenames
      .map { directory.appendingPathComponent($0).path }
      .filter { FileManager.default.fileExists(atPath: $0) }
  }

  /// The PendingShareImages directory inside the App Group container (may be nil).
  private static func pendingImagesDirectoryURL() -> URL? {
    FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: Self.appGroupIdentifier
    )?.appendingPathComponent(Self.pendingImagesDirectory, isDirectory: true)
  }

  /// Clears pending share data after processing
  @objc
  func clearPendingShareData(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let userDefaults = UserDefaults(suiteName: Self.appGroupIdentifier)
    userDefaults?.removeObject(forKey: Self.sharedKey)
    userDefaults?.removeObject(forKey: Self.urlKey)
    userDefaults?.removeObject(forKey: Self.imageKey)
    if let directory = Self.pendingImagesDirectoryURL() {
      try? FileManager.default.removeItem(at: directory)
    }
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

  /// Replaces the pending image list with the given absolute paths. Files the
  /// app absorbed are deleted from the container; failed ones stay pending.
  @objc
  func replacePendingShareImages(_ paths: NSArray, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let userDefaults = UserDefaults(suiteName: Self.appGroupIdentifier)

    guard let keptPaths = paths as? [String] else {
      reject("ERROR", "Invalid pending share image payload", nil)
      return
    }

    let keptFilenames = Set(keptPaths.map { ($0 as NSString).lastPathComponent })
    let existing = userDefaults?.stringArray(forKey: Self.imageKey) ?? []

    if let directory = Self.pendingImagesDirectoryURL() {
      for filename in existing where !keptFilenames.contains(filename) {
        try? FileManager.default.removeItem(
          at: directory.appendingPathComponent(filename)
        )
      }
    }

    if keptFilenames.isEmpty {
      userDefaults?.removeObject(forKey: Self.imageKey)
    } else {
      // Keep the recorded order of the surviving entries.
      userDefaults?.set(existing.filter { keptFilenames.contains($0) }, forKey: Self.imageKey)
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
    let hasImages = userDefaults?.object(forKey: Self.imageKey) != nil
    if !hasText && !hasUrls && !hasImages {
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
