package so.glimpse.mobile

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.atomic.AtomicBoolean
import jni.GlimpseBridgeJni

class RustraJSIModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  companion object {
    private val jniInitialized = AtomicBoolean(false)
    init {
      System.loadLibrary("rustrajsi")
    }
  }

  init {
    // One-shot: hand the Rust bridge the JVM so the shared `sync_discover`
    // command can drive NsdManager over JNI (plan B2-4). JNI_OnLoad already
    // captured the VM during loadLibrary; Kotlin gives the bridge its
    // application context directly.
    if (jniInitialized.compareAndSet(false, true)) {
      RustNsdDiscoveryBridge.setApplicationContext(reactContext.applicationContext)
      GlimpseBridgeJni.jniInit()
    }
  }

  override fun getName(): String = "RustraJSI"

  @ReactMethod
  fun install(promise: Promise) {
    val jsContextPointer = reactApplicationContext.javaScriptContextHolder?.get()
    if (jsContextPointer == null || jsContextPointer == 0L) {
      promise.reject("ERR_NO_RUNTIME", "JavaScript context pointer is null")
      return
    }

    // JS 스레드 CallInvoker — 이벤트 푸시 drain을 JS 런타임 스레드로 마샬링한다.
    // CallInvokerHolderImpl은 CatalystInstance가 만든 C++ CallInvoker를
    // 감싼 하이브리드 객체. JNI로 넘기면 C++ 쪽에서 cthis()->getCallInvoker()로
    // 실제 invoker를 꺼낸다.
    val holder = reactApplicationContext.jsCallInvokerHolder
    val success = nativeInstall(jsContextPointer, holder)
    if (success) {
      promise.resolve(true)
    } else {
      promise.reject("ERR_INSTALL", "Failed to install RustraJSI onto runtime")
    }
  }

  private external fun nativeInstall(
      jsContextNativePointer: Long,
      jsCallInvokerHolder: com.facebook.react.turbomodule.core.interfaces.CallInvokerHolder?
  ): Boolean
}
