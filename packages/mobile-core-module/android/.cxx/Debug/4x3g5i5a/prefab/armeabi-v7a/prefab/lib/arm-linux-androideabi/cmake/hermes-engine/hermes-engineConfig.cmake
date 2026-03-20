if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/Users/loopy/.gradle/caches/9.0.0/transforms/44cb238ccc9b1b7a5bf87029c8b55c61/transformed/hermes-android-0.14.1-debug/prefab/modules/hermesvm/libs/android.armeabi-v7a/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/loopy/.gradle/caches/9.0.0/transforms/44cb238ccc9b1b7a5bf87029c8b55c61/transformed/hermes-android-0.14.1-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

