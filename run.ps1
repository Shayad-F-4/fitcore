Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting FitCore (Sagar Fitness Gym Management System)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Ensure MongoDB service is running
$mongo = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($mongo -and $mongo.Status -ne 'Running') {
    Write-Host "[*] Starting MongoDB service..." -ForegroundColor Yellow
    Start-Service -Name MongoDB -ErrorAction SilentlyContinue
} else {
    Write-Host "[v] MongoDB is active." -ForegroundColor Green
}

Write-Host "`n[*] Launching Backend API (Port 5000) and Frontend App (Port 5173)..." -ForegroundColor Cyan
Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Web App:     http://localhost:5173" -ForegroundColor Green
Write-Host "  Backend API: http://localhost:5000/api/health" -ForegroundColor Yellow
Write-Host "  Credentials: admin@fitcore.com / password123" -ForegroundColor White
Write-Host "--------------------------------------------------------`n" -ForegroundColor DarkGray

npm run dev
