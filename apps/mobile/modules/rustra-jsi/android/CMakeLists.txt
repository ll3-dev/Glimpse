cmake_minimum_required(VERSION 3.18.1)
project(rustrajsi)

set(CMAKE_CXX_STANDARD 20)

set(CPP_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../ios)

# Prefab imports from React Native Android gradle dependencies
find_package(fbjni REQUIRED)
find_package(ReactAndroid REQUIRED)

# Import compiled Rust static library (glimpse-bridge: rustra_ffi_* +
# glimpse_ffi_init) for the current ABI. Lives beside the glimpse-core .so
# artifacts so both Rust builds share one libs root.
add_library(glimpse_bridge_static STATIC IMPORTED)
set_target_properties(glimpse_bridge_static PROPERTIES
    IMPORTED_LOCATION ${CMAKE_CURRENT_SOURCE_DIR}/../../../android/glimpse-core/libs/${ANDROID_ABI}/libglimpse_bridge.a
)

# Define shared library
add_library(rustrajsi SHARED
    src/main/cpp/rustra-jsi-jni.cpp
    ${CPP_DIR}/RustraJSIBridge.cpp
)

target_include_directories(rustrajsi PRIVATE
    ${CPP_DIR}
    src/main/cpp
)

target_link_libraries(rustrajsi
    PRIVATE
    glimpse_bridge_static
    fbjni::fbjni
    ReactAndroid::jsi
    ReactAndroid::reactnative
    android
    log
)
