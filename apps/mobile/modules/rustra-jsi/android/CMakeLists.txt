cmake_minimum_required(VERSION 3.18.1)
project(rustrajsi)

set(CMAKE_CXX_STANDARD 20)

set(CPP_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../ios)

# Prefab imports from React Native Android gradle dependencies
find_package(fbjni REQUIRED)
find_package(ReactAndroid REQUIRED)

# Import compiled Rust static library (glimpse-bridge: rustra_ffi_* +
# rustra_ffi_event_sink_* + glimpse_ffi_init) for the current ABI. Lives beside
# the glimpse-core .so artifacts so both Rust builds share one libs root.
add_library(glimpse_bridge_static STATIC IMPORTED)
set_target_properties(glimpse_bridge_static PROPERTIES
    IMPORTED_LOCATION ${CMAKE_CURRENT_SOURCE_DIR}/../../../android/glimpse-core/libs/${ANDROID_ABI}/libglimpse_bridge.a
)

# Define shared library
add_library(rustrajsi SHARED
    src/main/cpp/rustra-jsi-jni.cpp
    ${CPP_DIR}/RustraJSIBridge.cpp
)

# libglimpse_bridge.a is a Rust staticlib that links the full glimpse-core
# (sqlite3 bundled) object code. Without --exclude-libs every symbol in those
# objects (core_client_*, sqlite3_*, ...) is re-exported from librustrajsi.so,
# duplicating libglimpse_core.so's dynamic symbol table and risking symbol
# interposition across the two DSOs. ALL keeps only this library's own
# exports — the Java_so_glimpse_mobile_* JNI entry points.
target_link_options(rustrajsi PRIVATE "-Wl,--exclude-libs,ALL")

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
