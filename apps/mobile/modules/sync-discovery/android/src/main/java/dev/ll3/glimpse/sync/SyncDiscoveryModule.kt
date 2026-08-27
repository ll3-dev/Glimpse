package dev.ll3.glimpse.sync

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

private const val SERVICE_TYPE = "_glimpse-sync._tcp."

class SyncDiscoveryModule : Module() {
  private var activeDiscovery: NsdManager.DiscoveryListener? = null
  private var multicastLock: WifiManager.MulticastLock? = null

  override fun definition() = ModuleDefinition {
    Name("GlimpseSyncDiscovery")

    AsyncFunction("discover") { timeoutMs: Int, promise: Promise ->
      val context = appContext?.reactContext
      if (context == null) {
        promise.reject("DISCOVERY_UNAVAILABLE", "Android context is unavailable", null)
        return@AsyncFunction
      }
      discover(context, timeoutMs.coerceIn(500, 10_000), promise)
    }

    OnDestroy {
      stopActiveDiscovery()
    }
  }

  private fun discover(context: Context, timeoutMs: Int, promise: Promise) {
    stopActiveDiscovery()
    val manager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    multicastLock = (context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager)
      ?.createMulticastLock("glimpse-sync-discovery")
      ?.apply {
        setReferenceCounted(false)
        acquire()
      }
    val handler = Handler(Looper.getMainLooper())
    val results = ConcurrentHashMap<String, Map<String, Any?>>()
    val completed = AtomicBoolean(false)

    fun finish(error: Pair<String, String>? = null) {
      if (!completed.compareAndSet(false, true)) return
      stopActiveDiscovery()
      if (error != null) {
        promise.reject(error.first, error.second, null)
      } else {
        promise.resolve(results.values.toList())
      }
    }

    val listener = object : NsdManager.DiscoveryListener {
      override fun onDiscoveryStarted(serviceType: String) = Unit

      override fun onServiceFound(serviceInfo: NsdServiceInfo) {
        if (!serviceInfo.serviceType.startsWith("_glimpse-sync._tcp")) return
        @Suppress("DEPRECATION")
        manager.resolveService(serviceInfo, object : NsdManager.ResolveListener {
          override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) = Unit

          override fun onServiceResolved(resolved: NsdServiceInfo) {
            @Suppress("DEPRECATION")
            val host = resolved.host?.hostAddress ?: return
            val deviceId = resolved.attributes["deviceId"]?.toString(Charsets.UTF_8)
            val protocol = resolved.attributes["protocol"]
              ?.toString(Charsets.UTF_8)
              ?.toIntOrNull() ?: 1
            val key = deviceId ?: "${host}:${resolved.port}"
            results[key] = mapOf(
              "name" to resolved.serviceName,
              "host" to host,
              "port" to resolved.port,
              "deviceId" to deviceId,
              "protocolVersion" to protocol,
            )
          }
        })
      }

      override fun onServiceLost(serviceInfo: NsdServiceInfo) = Unit

      override fun onDiscoveryStopped(serviceType: String) = Unit

      override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
        finish("DISCOVERY_FAILED" to "NSD start failed: $errorCode")
      }

      override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = Unit
    }

    activeDiscovery = listener
    try {
      manager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, listener)
      handler.postDelayed({ finish() }, timeoutMs.toLong())
    } catch (error: Exception) {
      finish("DISCOVERY_FAILED" to (error.message ?: "NSD discovery failed"))
    }
  }

  private fun stopActiveDiscovery() {
    val listener = activeDiscovery
    activeDiscovery = null
    val context = appContext?.reactContext
    if (listener != null && context != null) {
      val manager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
      try {
        manager.stopServiceDiscovery(listener)
      } catch (_: Exception) {
        // The platform throws when discovery already stopped; cleanup is idempotent.
      }
    }
    multicastLock?.let { lock ->
      if (lock.isHeld) lock.release()
    }
    multicastLock = null
  }
}
