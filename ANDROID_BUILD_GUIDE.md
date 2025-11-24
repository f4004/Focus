---
description: How to build the Android APK
---

# Building the Android APK

Since you want an `.apk` file to install on your device, you have two main options: **EAS Build** (Cloud) or **Local Build**.

## Option 1: EAS Build (Recommended)
Expo Application Services (EAS) is the easiest way to build.

1.  **Install EAS CLI**:
    ```powershell
    npm install -g eas-cli
    ```
2.  **Login to Expo**:
    ```powershell
    eas login
    ```
3.  **Configure Build**:
    ```powershell
    eas build:configure
    ```
    - Select `Android`.
4.  **Build APK**:
    To get an installable APK (instead of an AAB for the store), modify `eas.json` to include a `preview` profile or just run:
    ```powershell
    eas build -p android --profile preview
    ```
5.  **Download**:
    Once finished, EAS will provide a link to download the `.apk`.

## Option 2: Local Build (Advanced)
If you have Android Studio and Java installed, you can build locally.

1.  **Prebuild**:
    Generate the native Android project.
    ```powershell
    npx expo prebuild
    ```
2.  **Open in Android Studio**:
    Open the `android` folder in Android Studio.
3.  **Build APK**:
    - Go to `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.
    - Or run in terminal:
      ```powershell
      cd android
      ./gradlew assembleRelease
      ```
    - The APK will be in `android/app/build/outputs/apk/release/app-release.apk`.

## Troubleshooting "Not working on Expo"
If the app crashes or doesn't load in Expo Go:
- Ensure you are on the same network.
- Clear cache: `npx expo start -c`.
- Some native libraries (like `expo-av` or `expo-notifications`) might require a "Development Build" instead of Expo Go if they include custom native code not in the standard client. However, the libraries we used are standard Expo libraries, so they should work in Expo Go.
