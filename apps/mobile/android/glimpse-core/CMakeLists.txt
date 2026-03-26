cmake_minimum_required(VERSION 3.10)
project(glimpse_core)

set(CMAKE_CXX_STANDARD 20)

add_library(glimpse_core SHARED
    OnLoad.cpp
)

target_link_options(glimpse_core PRIVATE "-Wl,--hash-style=both")

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/../../nitrogen/generated/shared/c++
    ${CMAKE_CURRENT_SOURCE_DIR}/../../nitrogen/generated/android
)

include(${CMAKE_CURRENT_SOURCE_DIR}/../../nitrogen/generated/android/glimpse_core+autolinking.cmake)

add_library(glimpse_core_rust SHARED IMPORTED)
set_target_properties(
    glimpse_core_rust
    PROPERTIES IMPORTED_LOCATION
    ${CMAKE_CURRENT_SOURCE_DIR}/libs/${ANDROID_ABI}/libglimpse_core.so
)

find_library(LOG_LIB log)

target_link_libraries(
    glimpse_core
    glimpse_core_rust
    ${LOG_LIB}
)
