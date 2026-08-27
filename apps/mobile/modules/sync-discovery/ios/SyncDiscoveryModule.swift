import ExpoModulesCore
import Foundation

private let syncServiceType = "_glimpse-sync._tcp."

public class SyncDiscoveryModule: Module {
  private var discovery: BonjourDiscovery?

  public func definition() -> ModuleDefinition {
    Name("GlimpseSyncDiscovery")

    AsyncFunction("discover") { (timeoutMs: Int, promise: Promise) in
      DispatchQueue.main.async {
        self.discovery?.stop()
        let discovery = BonjourDiscovery(promise: promise)
        self.discovery = discovery
        discovery.start(timeout: Double(min(max(timeoutMs, 500), 10_000)) / 1_000)
      }
    }

    OnDestroy {
      DispatchQueue.main.async {
        self.discovery?.stop()
        self.discovery = nil
      }
    }
  }
}

private final class BonjourDiscovery: NSObject, NetServiceBrowserDelegate, NetServiceDelegate {
  private let browser = NetServiceBrowser()
  private let promise: Promise
  private var services: [NetService] = []
  private var results: [String: [String: Any?]] = [:]
  private var completed = false
  private var completionWorkItem: DispatchWorkItem?

  init(promise: Promise) {
    self.promise = promise
    super.init()
    browser.delegate = self
  }

  func start(timeout: TimeInterval) {
    browser.searchForServices(ofType: syncServiceType, inDomain: "local.")
    let workItem = DispatchWorkItem { [weak self] in self?.finish() }
    completionWorkItem = workItem
    DispatchQueue.main.asyncAfter(deadline: .now() + timeout, execute: workItem)
  }

  func stop() {
    completionWorkItem?.cancel()
    browser.stop()
    services.forEach { $0.stop() }
    services.removeAll()
  }

  func netServiceBrowser(
    _ browser: NetServiceBrowser,
    didFind service: NetService,
    moreComing: Bool
  ) {
    services.append(service)
    service.delegate = self
    service.resolve(withTimeout: 2)
  }

  func netServiceDidResolveAddress(_ sender: NetService) {
    guard let host = sender.hostName?.trimmingCharacters(in: CharacterSet(charactersIn: ".")),
          sender.port > 0 else { return }
    let txt = NetService.dictionary(fromTXTRecord: sender.txtRecordData() ?? Data())
    let deviceId = txt["deviceId"].flatMap { String(data: $0, encoding: .utf8) }
    let protocolVersion = txt["protocol"]
      .flatMap { String(data: $0, encoding: .utf8) }
      .flatMap(Int.init) ?? 1
    let key = deviceId ?? "\(host):\(sender.port)"
    results[key] = [
      "name": sender.name,
      "host": host,
      "port": sender.port,
      "deviceId": deviceId,
      "protocolVersion": protocolVersion,
    ]
  }

  func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String: NSNumber]) {
    guard !completed else { return }
    completed = true
    stop()
    promise.reject("DISCOVERY_FAILED", "Bonjour discovery failed: \(errorDict)")
  }

  private func finish() {
    guard !completed else { return }
    completed = true
    let payload = Array(results.values)
    stop()
    promise.resolve(payload)
  }
}
