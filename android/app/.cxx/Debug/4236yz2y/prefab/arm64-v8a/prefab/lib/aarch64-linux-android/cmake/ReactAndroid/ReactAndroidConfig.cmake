if(NOT TARGET ReactAndroid::hermestooling)
add_library(ReactAndroid::hermestooling SHARED IMPORTED)
set_target_properties(ReactAndroid::hermestooling PROPERTIES
    IMPORTED_LOCATION "/Users/ron/.gradle/caches/8.13/transforms/df2c3af09c7dc02ae9126dc31e2cb69a/transformed/jetified-react-android-0.81.5-debug/prefab/modules/hermestooling/libs/android.arm64-v8a/libhermestooling.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/ron/.gradle/caches/8.13/transforms/df2c3af09c7dc02ae9126dc31e2cb69a/transformed/jetified-react-android-0.81.5-debug/prefab/modules/hermestooling/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::jsi)
add_library(ReactAndroid::jsi SHARED IMPORTED)
set_target_properties(ReactAndroid::jsi PROPERTIES
    IMPORTED_LOCATION "/Users/ron/.gradle/caches/8.13/transforms/df2c3af09c7dc02ae9126dc31e2cb69a/transformed/jetified-react-android-0.81.5-debug/prefab/modules/jsi/libs/android.arm64-v8a/libjsi.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/ron/.gradle/caches/8.13/transforms/df2c3af09c7dc02ae9126dc31e2cb69a/transformed/jetified-react-android-0.81.5-debug/prefab/modules/jsi/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::reactnative)
add_library(ReactAndroid::reactnative SHARED IMPORTED)
set_target_properties(ReactAndroid::reactnative PROPERTIES
    IMPORTED_LOCATION "/Users/ron/.gradle/caches/8.13/transforms/df2c3af09c7dc02ae9126dc31e2cb69a/transformed/jetified-react-android-0.81.5-debug/prefab/modules/reactnative/libs/android.arm64-v8a/libreactnative.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/ron/.gradle/caches/8.13/transforms/df2c3af09c7dc02ae9126dc31e2cb69a/transformed/jetified-react-android-0.81.5-debug/prefab/modules/reactnative/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

