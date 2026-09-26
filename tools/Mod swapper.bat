@echo off
REM Double-click this to run the mod swapper. It finds your RPG Maker games, backs up the
REM originals before installing anything, and can put them back.
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0modswap.ps1"
echo.
pause
