@echo off
:: OTA Flash script for Witty Fox ESP32 Storm Board
:: Usage:
::   ota_flash.bat                  — compile + flash WaterTank sketch
::   ota_flash.bat path\to\file.bin — flash a pre-built binary directly

setlocal

set ESP_IP=192.168.0.126
set ESP_PORT=3232
set CLI=%LOCALAPPDATA%\arduino-cli\arduino-cli.exe
set ESPOTA=%LOCALAPPDATA%\Arduino15\packages\esp32\hardware\esp32\3.3.8\tools\espota.py
set SKETCH=%USERPROFILE%\Documents\Arduino\WaterTank
set BUILD=%TEMP%\watertank_build

if "%~1"=="" (
    echo [1/2] Compiling WaterTank sketch...
    "%CLI%" compile --fqbn esp32:esp32:esp32 --build-path "%BUILD%" "%SKETCH%"
    if errorlevel 1 ( echo Compile failed. & exit /b 1 )
    set BIN=%BUILD%\WaterTank.ino.bin
) else (
    set BIN=%~1
)

echo [2/2] OTA flashing to %ESP_IP%:%ESP_PORT% ...
python "%ESPOTA%" -i %ESP_IP% -p %ESP_PORT% -f "%BIN%" --timeout 30

if errorlevel 1 (
    echo.
    echo FAILED. Is the board on Neo6G and is wfHandleOTA called in loop?
    exit /b 1
)
echo.
echo Done! Board rebooting with new firmware.
