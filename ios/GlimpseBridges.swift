import Foundation
import UIKit
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
