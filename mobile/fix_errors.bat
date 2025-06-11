@echo off
echo Fixing React Native errors...

REM Delete any potential build cache
rmdir /s /q "%APPDATA%\Temp\react-native-packager-cache-*" 2>nul
rmdir /s /q "%TEMP%\metro-*" 2>nul
rmdir /s /q "%APPDATA%\npm-cache" 2>nul
rmdir /s /q ".expo" 2>nul

REM Install dependencies again to ensure they're correct
call npm install

REM Clear watchman watches if watchman is installed
watchman watch-del-all 2>nul

REM Clear Metro bundler cache
call npx react-native start --reset-cache

echo Cleanup complete. Please try running the app again.
