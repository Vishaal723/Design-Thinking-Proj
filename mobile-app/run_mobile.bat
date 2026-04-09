@echo off
echo ======================================
echo    MacroCloud Mobile App (Expo)
echo ======================================
echo.
echo Starting Expo dev server...
echo Use Expo Go app on your phone to scan the QR code.
echo For Android Emulator, press 'a' after server starts.
echo.
cd /d %~dp0
npm start
