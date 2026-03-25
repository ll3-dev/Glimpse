# apps/mobile/modules/rust_core/CMakeLists.txt
cmake_minimum_required(VERSION 3.22.1)
project(rust_core)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Rust core library (built separately with cargo)
# The .a file will be built by: cd packages/core-rust && cargo build --release --target aarch64-apple-ios
set(RUST_CORE_LIB_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../packages/core-rust/target/aarch64-apple-ios/release")
set(RUST_CORE_LIB "${RUST_CORE_LIB_DIR}/libglimpse_core.a")

# Create the C++ wrapper library
add_library(rust_core STATIC
    HybridCoreClient.cpp
)

target_include_directories(rust_core PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Link against Rust static library
target_link_libraries(rust_core
    ${RUST_CORE_LIB}
)

# iOS-specific configuration
if(IOS)
    set_target_properties(rust_core PROPERTIES
        FRAMEWORK FALSE
        ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_LIBRARY_OUTPUT_DIRECTORY}"
    )
endif()

# Android-specific configuration
if(ANDROID)
    set(RUST_CORE_LIB_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../packages/core-rust/target/${ANDROID_ABI}/release")
    set_target_properties(rust_core PROPERTIES
        ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_LIBRARY_OUTPUT_DIRECTORY}"
    )
endif()
