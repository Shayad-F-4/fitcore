@echo off
title FitCore - Automated Database Backup
color 0B

echo ========================================================
echo   FitCore Database Backup Pipeline (Sagar Fitness Gym)
echo ========================================================
echo.

set TIMESTAMP=%date:~10,4%-%date:~4,2%-%date:~7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DIR=%~dp0..\backups\%TIMESTAMP%

echo [*] Target backup directory: %BACKUP_DIR%
mkdir "%BACKUP_DIR%" 2>nul

echo [*] Running mongodump for 'fitcore' database...
mongodump --db=fitcore --out="%BACKUP_DIR%"

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo [v] SUCCESS: Database backup created successfully!
    echo     Location: %BACKUP_DIR%\fitcore
    echo ========================================================
) else (
    echo.
    echo [!] mongodump utility not found or database not reachable.
    echo     Tip: Ensure MongoDB bin directory is in your PATH.
)
echo.
pause
