if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/ron/.gradle/caches/8.13/transforms/8e90cbfc8cdadc5a0f4274ea6858c9ae/transformed/jetified-hermes-android-0.81.5-release/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/ron/.gradle/caches/8.13/transforms/8e90cbfc8cdadc5a0f4274ea6858c9ae/transformed/jetified-hermes-android-0.81.5-release/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

