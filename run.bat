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
echo [*] Launching FitCore Sagar Fitness Gym Server (Port 5000)...
echo.
echo --------------------------------------------------------
echo   Web App URL:  http://localhost:5000
echo   Backend API:  http://localhost:5000/api/health
echo.
echo   Login Accounts:
echo   1. shayadfakir2006@gmail.com / password123
echo   2. admin@sagarfitness.com / password123
echo --------------------------------------------------------
echo.

npm run dev
