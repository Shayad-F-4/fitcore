# FitCore Automated Database Backup Pipeline
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupRoot = Join-Path $PSScriptRoot "..\backups"
$targetDir = Join-Path $backupRoot $timestamp

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  FitCore Database Backup Pipeline (Sagar Fitness Gym)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

Write-Host "`n[*] Starting mongodump for 'fitcore' database..." -ForegroundColor Yellow
$dumpCmd = Get-Command mongodump -ErrorAction SilentlyContinue

if ($dumpCmd) {
    & mongodump --db=fitcore --out=$targetDir
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[v] SUCCESS: Database backup created at: $targetDir\fitcore" -ForegroundColor Green
    } else {
        Write-Host "`n[!] Backup command failed with exit code $LASTEXITCODE." -ForegroundColor Red
    }
} else {
    Write-Host "[!] 'mongodump' CLI utility was not found in PATH." -ForegroundColor Yellow
    Write-Host "    Backup can be taken using MongoDB Compass or by adding MongoDB bin to PATH." -ForegroundColor DarkGray
}

# Prune backups older than 7 days
Get-ChildItem -Path $backupRoot -Directory -ErrorAction SilentlyContinue | Where-Object {
    $_.CreationTime -lt (Get-Date).AddDays(-7)
} | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
