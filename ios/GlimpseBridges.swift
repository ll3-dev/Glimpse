import Foundation
import UIKit
import WidgetKit
import NitroModules

// MARK: - GlimpseBridges

public class GlimpseBridges : HybridGlimpseBridgesSpec {
  public var hybridContext = margelo.nitro.HybridContext()

  public var memorySize: Int {
    return getSizeOf(self)
  }

  // Widget data storage
  public func set(key: String, value: String, suite: String?) throws {
    let userDefaults = UserDefaults(suiteName: suite)
    userDefaults?.set(value, forKey: key)
  }

  // Clipboard methods
  public func getClipboardString() throws -> Promise<String> {
    return Promise { resolve in
      resolve(UIPasteboard.general.string ?? "")
    }
  }

  public func setClipboardString(content: String) throws -> Promise<Void> {
    return Promise { resolve in
      UIPasteboard.general.string = content
      resolve(())
    }
  }

  public func hasClipboard() throws -> Promise<Bool> {
    return Promise { resolve in
      resolve(UIPasteboard.general.hasStrings)
    }
  }
}

// MARK: - ClipboardMonitor

public class ClipboardMonitor : HybridClipboardMonitorSpec {
  public var hybridContext = margelo.nitro.HybridContext()

  public var memorySize: Int {
    return getSizeOf(self)
  }

  private var isMonitoringState: Bool = false
  private var onChangeCallback: ((ClipboardItem) -> Void)?
  private var lastClipboardChangeCount: Int = 0
  private var clipboardTimer: Timer?

  public func startMonitoring(onChange: @escaping (ClipboardItem) -> Void) throws -> Promise<Void> {
    return Promise { resolve in
      guard !isMonitoringState else {
        resolve(())
        return
      }

      isMonitoringState = true
      onChangeCallback = onChange

      // Initialize with current change count
      lastClipboardChangeCount = UIPasteboard.general.changeCount

      // Start timer to check clipboard changes every 0.5 seconds
      clipboardTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
        self?.checkClipboardChange()
      }

      // Also observe pasteboard notifications for immediate detection
      NotificationCenter.default.addObserver(
        forName: UIPasteboard.changedNotification,
        object: UIPasteboard.general,
        queue: .main
      ) { [weak self] _ in
        self?.checkClipboardChange()
      }

      resolve(())
    }
  }

  public func stopMonitoring() throws -> Promise<Void> {
    return Promise { resolve in
      isMonitoringState = false
      clipboardTimer?.invalidate()
      clipboardTimer = nil
      onChangeCallback = nil
      NotificationCenter.default.removeObserver(self as Any)
      resolve(())
    }
  }

  public func isMonitoring() throws -> Bool {
    return isMonitoringState
  }

  private func checkClipboardChange() {
    let currentCount = UIPasteboard.general.changeCount

    guard currentCount != lastClipboardChangeCount else {
      return
    }

    lastClipboardChangeCount = currentCount

    guard let content = UIPasteboard.general.string, !content.isEmpty else {
      return
    }

    let type = detectContentType(content: content)
    let item = ClipboardItem(
      type: type,
      content: content,
      timestamp: Int64(Date().timeIntervalSince1970 * 1000)
    )

    onChangeCallback?(item)
  }

  private func detectContentType(content: String) -> ClipboardItemType {
    if let url = URL(string: content), url.scheme != nil {
      return .url
    }

    if content.hasPrefix("/var/mobile/") || content.hasPrefix("/private/var/") {
      return .file
    }

    return .text
  }

  deinit {
    try? stopMonitoring().wait()
  }
}
