#include "../../nitrogen/generated/android/glimpse_coreOnLoad.hpp"
#include <jni.h>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return margelo::nitro::glimpse::initialize(vm);
}
