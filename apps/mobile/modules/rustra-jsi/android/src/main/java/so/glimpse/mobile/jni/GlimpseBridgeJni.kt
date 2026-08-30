package jni

/**
 * Loader shim for the glimpse-bridge staticlib's C ABI
 * (`glimpse_jni_init`, exported by `libglimpse_bridge.a`).
 *
 * Reverse `Java_*` calls into the staticlib itself are impossible —
 * `librustrajsi.so` links it with `--exclude-libs,ALL`, so its symbols are
 * invisible to dlsym. The visible trampoline
 * `Java_jni_GlimpseBridgeJni_jniInit` lives in `rustra-jsi-jni.cpp` (part of
 * the .so, which dlsym does scan) and forwards to the staticlib's plain C
 * symbol. This class only gives the JVM an importable name for it.
 */
object GlimpseBridgeJni {
  init {
    // rustrajsi.so statically links glimpse-bridge; loading it here mirrors
    // RustraJSIModule's own load and keeps one canonical load site.
    System.loadLibrary("rustrajsi")
  }

  /** Hands the process JavaVM (captured in JNI_OnLoad) to the Rust bridge. */
  @JvmStatic
  external fun jniInit()
}
