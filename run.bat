@echo off
title FitCore - Sagar Fitness Gym System
color 0A

echo ========================================================
echo   Starting FitCore (Sagar Fitness Gym Management System)
echo ========================================================
echo.

:: 1. Check and start MongoDB service if not running
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo [*] Starting MongoDB service...
    net start MongoDB >nul 2>&1
) else (
    echo [v] MongoDB is already running.
)

echo.
echo [*] Launching Backend API (Port 5000) and Frontend App (Port 5173)...
echo.
echo --------------------------------------------------------
echo   Web App URL:  http://localhost:5173
echo   Backend API:  http://localhost:5000/api/health
echo.
echo   Default Login:
echo   Email:    admin@fitcore.com
echo   Password: password123
echo --------------------------------------------------------
echo.

npm run dev
