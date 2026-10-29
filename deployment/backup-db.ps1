# ===================================================================
# Assam Skill University — Automated Database Backup Script (PowerShell)
# Stores consistent daily SQLite snapshots with 30-day rotation.
# ===================================================================

$SourceDir = Split-Path -Parent $PSScriptRoot
$DbFile = Join-Path $SourceDir "data\asu_conference.sqlite"
$BackupDir = Join-Path $SourceDir "backups"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$TargetBackup = Join-Path $BackupDir "asu_conference_backup_$Timestamp.sqlite"

Write-Host "[ASU Backup] Source Database: $DbFile" -ForegroundColor Cyan
Write-Host "[ASU Backup] Creating snapshot: $TargetBackup" -ForegroundColor Cyan

if (Test-Path $DbFile) {
    # Perform file copy
    Copy-Item -Path $DbFile -Destination $TargetBackup -Force
    Write-Host "[ASU Backup] Snapshot created successfully." -ForegroundColor Green

    # Rotate backups older than 30 days
    $CutoffDate = (Get-Date).AddDays(-30)
    Get-ChildItem -Path $BackupDir -Filter "asu_conference_backup_*.sqlite" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | ForEach-Object {
        Write-Host "[ASU Backup] Removing expired backup: $($_.Name)" -ForegroundColor Yellow
        Remove-Item $_.FullName -Force
    }
} else {
    Write-Host "[ASU Backup] Error: Database file not found at $DbFile" -ForegroundColor Red
}
