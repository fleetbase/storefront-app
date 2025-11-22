# Fix: CMake Codegen Directory Errors After Enabling New Architecture

## Problem

After enabling the New Architecture (`newArchEnabled=true`), you're getting CMake errors like:

```
CMake Error: add_subdirectory given source
"/path/to/node_modules/react-native-keychain/android/build/generated/source/codegen/jni/"
which is not an existing directory.
```

This happens because the codegen directories haven't been generated yet.

## Solution

### Option 1: Full Clean and Rebuild (Recommended)

```bash
# 1. Clean everything
cd android
./gradlew clean
rm -rf .gradle
rm -rf app/build
rm -rf app/.cxx
cd ..

# 2. Clean node_modules build artifacts
rm -rf node_modules/*/android/build
rm -rf node_modules/**/android/build

# 3. Rebuild
cd android
./gradlew assembleDebug
# or
cd ..
npx react-native run-android
```

### Option 2: Delete .cxx Directory Only

If Option 1 doesn't work, try:

```bash
cd android
rm -rf app/.cxx
./gradlew clean
./gradlew assembleDebug
```

### Option 3: Invalidate Caches (If using Android Studio)

1. Open the project in Android Studio
2. Go to **File** → **Invalidate Caches / Restart**
3. Select **Invalidate and Restart**
4. After restart, rebuild the project

## Why This Happens

When you enable the New Architecture:

1. React Native needs to generate **codegen** files for all native modules
2. These files are generated during the build process
3. CMake looks for these directories **before** they're created
4. Running `./gradlew clean` while CMake is in an inconsistent state causes this error

The solution is to completely remove the CMake cache (`.cxx` directory) and build artifacts, then rebuild from scratch.

## Verification

After the fix, you should see:

```bash
BUILD SUCCESSFUL in Xs
```

And the app should launch without errors.

## Additional Notes

- This is a **one-time issue** when first enabling the New Architecture
- Once the codegen directories are generated, subsequent builds will work fine
- If you still get errors, ensure all dependencies are compatible with the New Architecture

## Related Issues

- [React Native GitHub: New Architecture codegen errors](https://github.com/facebook/react-native/issues)
- [Stack Overflow: CMake codegen directory not found](https://stackoverflow.com/questions/tagged/react-native)
