#include <jni.h>
#include <jsi/jsi.h>
#include <android/log.h>
#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/CallInvokerHolder.h>
#include <fbjni/fbjni.h>
#include <memory>

#include "RustraJSIBridge.hpp"

// glimpse-bridge staticlib's C ABI (plain symbol, not a Java_* JNI export —
// --exclude-libs,ALL keeps staticlib symbols out of this .so's dynamic table,
// so the JVM can only see the Java_* trampolines defined right here).
extern "C" void glimpse_jni_init(void *java_vm);

#define LOG_TAG "RustraJSI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Process JavaVM, captured by JNI_OnLoad for glimpse_jni_init.
static JavaVM *g_java_vm = nullptr;

// Standard entry: System.loadLibrary("rustrajsi") invokes this with the VM.
extern "C" JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  g_java_vm = vm;
  return JNI_VERSION_1_6;
}

// Java CallInvokerHolderImpl(CallInvokerHolder 하이브리드) → C++ CallInvoker.
// TurboModuleManager.initHybrid와 동일한 fbjni 경로: adopt_local로 로컬 ref를
// 감싸고 cthis()로 C++ 부분을 꺼낸다. 실패 시 nullptr 반환 — 호출부는 invoker
// 없이 설치해 JS 폴링(drainEvents) 폴백으로 동작시킨다.
static std::shared_ptr<facebook::react::CallInvoker> extractCallInvoker(
    JNIEnv* env, jobject holderObj) {
  if (env == nullptr || holderObj == nullptr) return nullptr;
  try {
    auto holder = facebook::jni::adopt_local<
        facebook::react::CallInvokerHolder::javaobject>(
        reinterpret_cast<
            facebook::react::CallInvokerHolder::javaobject>(holderObj));
    if (!holder) return nullptr;
    return holder->cthis()->getCallInvoker();
  } catch (const std::exception& ex) {
    LOGE("extractCallInvoker: %s", ex.what());
    return nullptr;
  } catch (...) {
    LOGE("extractCallInvoker: unknown exception");
    return nullptr;
  }
}

// Loader shim for jni.GlimpseBridgeJni.jniInit — forwards the captured VM
// into the staticlib's C entry point. The application Context never crosses
// into Rust: Kotlin hands it to RustNsdDiscoveryBridge directly.
extern "C" JNIEXPORT void JNICALL
Java_jni_GlimpseBridgeJni_jniInit(JNIEnv *env, jobject /*thiz*/) {
  if (g_java_vm == nullptr) {
    LOGE("jniInit: VM unavailable (JNI_OnLoad not called?)");
    return;
  }
  glimpse_jni_init(g_java_vm);
}

extern "C" JNIEXPORT jboolean JNICALL
Java_so_glimpse_mobile_RustraJSIModule_nativeInstall(
    JNIEnv *env,
    jobject ths,
    jlong jsContextNativePointer,
    jobject jsCallInvokerHolder
) {
  if (jsContextNativePointer == 0) {
    LOGE("nativeInstall: jsContextNativePointer is null");
    return JNI_FALSE;
  }

  auto *runtime =
      reinterpret_cast<facebook::jsi::Runtime *>(jsContextNativePointer);
  if (!runtime) {
    LOGE("nativeInstall: failed to cast pointer to facebook::jsi::Runtime");
    return JNI_FALSE;
  }

  auto invoker = extractCallInvoker(env, jsCallInvokerHolder);
  if (!invoker) {
    LOGI("nativeInstall: jsCallInvoker unavailable — event push falls back to JS polling (drainEvents)");
  }

  try {
    // void shared_ptr로 type-erase해 전달 — RustraJSIBridge.cpp가 iOS/Android
    // 단일 정의를 유지한다.
    rustra::installRustraJSIWithInvoker(
        *runtime, std::static_pointer_cast<void>(invoker));
    LOGI("RustraJSI bindings successfully installed on Android JSI Runtime");
    return JNI_TRUE;
  } catch (const std::exception &ex) {
    LOGE("nativeInstall exception: %s", ex.what());
    return JNI_FALSE;
  } catch (...) {
    LOGE("nativeInstall unknown exception");
    return JNI_FALSE;
  }
}
