cmake_minimum_required(VERSION 3.13)

project(glimpsecore)

set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 20)

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)
find_package(react-native-nitro-modules REQUIRED CONFIG)

add_library(glimpsecore-lib STATIC IMPORTED)
set_target_properties(glimpsecore-lib PROPERTIES
  IMPORTED_LOCATION "${CMAKE_SOURCE_DIR}/src/main/jni/libs/${ANDROID_ABI}/libglimpsecore-prebuilt.a"
)
target_include_directories(glimpsecore-lib INTERFACE
  "${CMAKE_SOURCE_DIR}/src/main/jni/include"
)

add_library(cxx-glimpsecore SHARED
  src/main/jni/OnLoad.cpp
  src/main/jni/src/ffi.rs.cc
  ../cpp/HybridGlimpseCore.cpp
)
target_include_directories(cxx-glimpsecore PRIVATE
  ../cpp
)

target_link_libraries(cxx-glimpsecore
  fbjni::fbjni
  ReactAndroid::reactnative
  ReactAndroid::jsi
  react-native-nitro-modules::NitroModules
  glimpsecore-lib
)

target_compile_definitions(cxx-glimpsecore PRIVATE
  -DFOLLY_NO_CONFIG=1
  -DFOLLY_HAVE_CLOCK_GETTIME=1
  -DFOLLY_USE_LIBCPP=1
  -DFOLLY_CFG_NO_COROUTINES=1
  -DFOLLY_MOBILE=1
  -DFOLLY_HAVE_RECVMMSG=1
  -DFOLLY_HAVE_PTHREAD=1
  # Once we target android-23 above, we can comment
  # the following line. NDK uses GNU style stderror_r() after API 23.
  -DFOLLY_HAVE_XSI_STRERROR_R=1
)
