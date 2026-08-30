package so.glimpse.mobile

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject

/**
 * JVM-side half of the Android sync discovery backend (plan B2-4).
 *
 * Rust orchestrates everything over JNI (`sync_discovery::jni`): it calls
 * [start], polls [takeResultsJson] until this bridge signals completion, then
 * calls [stop]. The bridge implements `NsdManager.DiscoveryListener` — a Java
 * interface can only be implemented in JVM code — and resolves each found
 * service with the same TXT attribute contract as
 * `SyncDiscoveryModule.kt` (deviceId/protocol, `_glimpse-sync._tcp.`).
 *
 * It deliberately holds no pairing/sync logic: this is plumbing so the shared
 * Rust `sync_discover` command can serve Android without a JS detour.
 */
object RustNsdDiscoveryBridge {
  private const val SERVICE_TYPE = "_glimpse-sync._tcp."

  @Volatile private var context: Context? = null
  private var manager: NsdManager? = null
  private var listener: NsdManager.DiscoveryListener? = null
  private var multicastLock: WifiManager.MulticastLock? = null
  private val results = JSONArray()
  @Volatile private var finished = false
  private val handler = Handler(Looper.getMainLooper())

  /** Called by Rust `jni_init` once at module load. Idempotent, last wins. */
  @JvmStatic
  fun setApplicationContext(applicationContext: Context) {
    context = applicationContext.applicationContext
  }

  /**
   * Begin discovery; resolutions accumulate into [results]. `timeoutMs` also
   * arms the internal completion timer so [takeResultsJson] eventually hands
   * back the batch even if Rust's poll loop ended first.
   */
  @JvmStatic
  fun start(timeoutMs: Int) {
    stop()
    val appContext = context ?: return
    val nsdManager =
      appContext.getSystemService(Context.NSD_SERVICE) as? NsdManager ?: return
    manager = nsdManager
    multicastLock =
      (appContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager)
        ?.createMulticastLock("glimpse-sync-discovery-rust")
        ?.apply {
          setReferenceCounted(false)
          acquire()
        }
    finished = false

    val discoveryListener = object : NsdManager.DiscoveryListener {
      override fun onDiscoveryStarted(serviceType: String) = Unit

      override fun onServiceFound(serviceInfo: NsdServiceInfo) {
        if (!serviceInfo.serviceType.startsWith("_glimpse-sync._tcp")) return
        @Suppress("DEPRECATION")
        nsdManager.resolveService(serviceInfo, object : NsdManager.ResolveListener {
          override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) = Unit

          override fun onServiceResolved(resolved: NsdServiceInfo) {
            @Suppress("DEPRECATION")
            val host = resolved.host?.hostAddress ?: return
            val deviceId = resolved.attributes["deviceId"]?.toString(Charsets.UTF_8)
            val protocol = resolved.attributes["protocol"]
              ?.toString(Charsets.UTF_8)
              ?.toIntOrNull() ?: 1
            val entry = JSONObject().apply {
              put("name", resolved.serviceName)
              put("host", host)
              put("port", resolved.port)
              put("deviceId", deviceId ?: JSONObject.NULL)
              put("protocolVersion", protocol)
            }
            synchronized(results) { results.put(entry) }
          }
        })
      }

      override fun onServiceLost(serviceInfo: NsdServiceInfo) = Unit

      override fun onDiscoveryStopped(serviceType: String) = Unit

      override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
        finish()
      }

      override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = Unit
    }
    listener = discoveryListener
    try {
      nsdManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
    } catch (_: Exception) {
      finish()
      return
    }
    handler.postDelayed({ finish() }, timeoutMs.coerceIn(100, 10_000).toLong())
  }

  /**
   * Rust poll hook: `null` while discovery is running, the full result JSON
   * once (then the batch is consumed — a later call returns `null` again
   * until the next [start]).
   */
  @JvmStatic
  fun takeResultsJson(): String? {
    if (!finished) return null
    synchronized(results) {
      if (results.length() == 0) return "[]"
      val json = results.toString()
      // Consume: Rust re-polls only after a fresh start().
      for (index in results.length() - 1 downTo 0) results.remove(index)
      return json
    }
  }

  /** Idempotent teardown — safe to call from Rust and from [start]. */
  @JvmStatic
  fun stop() {
    handler.removeCallbacksAndMessages(null)
    val currentListener = listener
    listener = null
    val nsdManager = manager
    manager = null
    if (currentListener != null && nsdManager != null) {
      try {
        nsdManager.stopServiceDiscovery(currentListener)
      } catch (_: Exception) {
        // Discovery may already be stopped; teardown stays idempotent.
      }
    }
    multicastLock?.let { lock ->
      if (lock.isHeld) lock.release()
    }
    multicastLock = null
    finished = true
  }

  private fun finish() {
    finished = true
  }
}
