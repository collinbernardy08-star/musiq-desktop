@echo off
echo.
echo ╔══════════════════════════════════════╗
echo ║   Spotify Tracker Desktop Setup      ║
echo ╚══════════════════════════════════════╝
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo ❌ Node.js nicht gefunden. Bitte installiere Node.js 18+ von https://nodejs.org
  pause
  exit /b 1
)

echo ✓ Node.js gefunden
echo.

echo 📦 Installiere Haupt-Dependencies...
call npm install
echo ✓ Haupt-Dependencies installiert
echo.

echo 📦 Installiere Renderer-Dependencies...
cd src\renderer
call npm install
cd ..\..
echo ✓ Renderer-Dependencies installiert
echo.

echo ╔══════════════════════════════════════╗
echo ║          Setup abgeschlossen!        ║
echo ╚══════════════════════════════════════╝
echo.
echo Starten mit:
echo   npm run dev     -- Development Mode
echo   npm run dist    -- Build and Package
echo.
pause
