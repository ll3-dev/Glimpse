import Foundation

/**
 * Swift wrapper for Rust FFI to enable direct database access from Share Extension.
 *
 * This allows the Share Extension to save knowledge items without opening the main app.
 */

// MARK: - FFI Types (mirrors glimpse_core.h)

/// Opaque handle to a CoreClient instance
typealias CoreClientHandle = UnsafeMutableRawPointer

/// FFI error codes
enum FfiErrorCode: Int32 {
  case ok = 0
  case invalidInput = 1
  case notFound = 2
  case conflict = 3
  case database = 4
  case timeout = 5
  case cancelled = 6
  case internal = 7
}

// MARK: - FFI Function Declarations

@_silgen_name("core_client_create")
func core_client_create(_ dbPath: UnsafePointer<CChar>) -> CoreClientHandle?

@_silgen_name("core_client_destroy")
func core_client_destroy(_ handle: CoreClientHandle)

@_silgen_name("core_client_save_knowledge_item")
func core_client_save_knowledge_item(
  _ handle: CoreClientHandle,
  _ itemJson: UnsafePointer<CChar>,
  _ outJson: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>
) -> Int32

@_silgen_name("ffi_string_free")
func ffi_string_free(_ s: UnsafeMutablePointer<CChar>)

@_silgen_name("core_client_get_last_error")
func core_client_get_last_error(_ buffer: UnsafeMutablePointer<CChar>, _ bufferLen: Int32) -> Int32

// MARK: - CoreClient Swift Wrapper

/// Swift wrapper for the Rust CoreClient FFI
class GlimpseCoreBridge {
  private var handle: CoreClientHandle?
  private let appGroupIdentifier = "group.kr.ll3.glimpse"

  /// Shared instance for use in Share Extension
  static let shared = GlimpseCoreBridge()

  private init() {}

  deinit {
    if let handle = handle {
      core_client_destroy(handle)
    }
  }

  /// Initializes the core client with the App Group database path
  func initialize() throws {
    guard let containerURL = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: appGroupIdentifier
    ) else {
      throw GlimpseCoreError.appGroupNotFound
    }

    let dbPath = containerURL.appendingPathComponent("glimpse.sqlite").path

    guard let newHandle = dbPath.withCString({ path in
      core_client_create(path)
    }) else {
      throw GlimpseCoreError.initializationFailed(getLastError())
    }

    handle = newHandle
  }

  /// Saves a knowledge item directly to the database
  func saveKnowledgeItem(
    type: String,
    title: String?,
    body: String?,
    url: String?,
    text: String?
  ) throws -> String {
    guard let handle = handle else {
      throw GlimpseCoreError.notInitialized
    }

    // Build JSON for the knowledge item
    var itemDict: [String: Any] = [
      "id": UUID().uuidString,
      "type": type,
      "createdAt": Int64(Date().timeIntervalSince1970 * 1000),
      "updatedAt": Int64(Date().timeIntervalSince1970 * 1000)
    ]

    if let title = title { itemDict["title"] = title }
    if let body = body { itemDict["body"] = body }
    if let url = url { itemDict["url"] = url }

    // For share type, use text as body if body is not set
    if type == "share" && body == nil && text != nil {
      itemDict["body"] = text
    }

    guard let jsonData = try? JSONSerialization.data(withJSONObject: itemDict),
          let jsonString = String(data: jsonData, encoding: .utf8) else {
      throw GlimpseCoreError.jsonEncodingFailed
    }

    var outJson: UnsafeMutablePointer<CChar>? = nil

    let result = jsonString.withCString { jsonPtr in
      core_client_save_knowledge_item(handle, jsonPtr, &outJson)
    }

    guard result == FfiErrorCode.ok.rawValue else {
      throw GlimpseCoreError.saveFailed(getLastError())
    }

    guard let outJson = outJson else {
      throw GlimpseCoreError.noResult
    }

    let savedItemJson = String(cString: outJson)
    ffi_string_free(outJson)

    return savedItemJson
  }

  /// Gets the last error message from FFI
  private func getLastError() -> String {
    var buffer = [CChar](repeating: 0, count: 512)
    let len = core_client_get_last_error(&buffer, 512)
    if len > 0 {
      return String(cString: buffer)
    }
    return "Unknown error"
  }
}

// MARK: - Error Types

enum GlimpseCoreError: Error, LocalizedError {
  case appGroupNotFound
  case initializationFailed(String)
  case notInitialized
  case jsonEncodingFailed
  case saveFailed(String)
  case noResult

  var errorDescription: String? {
    switch self {
    case .appGroupNotFound:
      return "App Group container not found"
    case .initializationFailed(let message):
      return "Failed to initialize CoreClient: \(message)"
    case .notInitialized:
      return "CoreClient not initialized"
    case .jsonEncodingFailed:
      return "Failed to encode JSON"
    case .saveFailed(let message):
      return "Failed to save knowledge item: \(message)"
    case .noResult:
      return "No result returned from save operation"
    }
  }
}
