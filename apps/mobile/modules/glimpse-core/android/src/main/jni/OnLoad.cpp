#include <NitroModules/HybridObjectRegistry.hpp>
#include <fbjni/fbjni.h>
#include <jni.h>
#include "HybridGlimpseCore.hpp"

jint JNI_OnLoad(JavaVM *vm, void *reserved) {
  return facebook::jni::initialize(vm, [] {
    margelo::nitro::HybridObjectRegistry::registerHybridObjectConstructor(
      "GlimpseCore",
      []() -> std::shared_ptr<margelo::nitro::HybridObject> {
        return std::make_shared<ll3::glimpse::HybridGlimpseCore>();
      });
  });
}

extern "C"
JNIEXPORT void JNICALL
Java_kr_ll3_glimpse_core_GlimpsecorePackage_nativeSetDataPath(JNIEnv *env, jclass clazz, jstring jDataPath) {
  const char* cDataPath = env->GetStringUTFChars(jDataPath, nullptr);
  auto dataPath = std::string(cDataPath);
  env->ReleaseStringUTFChars(jDataPath, cDataPath);
  ll3::glimpse::HybridGlimpseCore::setDataPath(dataPath);
}
