if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/ron/.gradle/caches/8.13/transforms/4c29f3a3a7caff81d59a2b37004070d5/transformed/jetified-hermes-android-0.81.5-debug/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/ron/.gradle/caches/8.13/transforms/4c29f3a3a7caff81d59a2b37004070d5/transformed/jetified-hermes-android-0.81.5-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

