# ===================================================================
# Assam Skill University — Database Restore Script (PowerShell)
# Restores a selected backup file to active data/asu_conference.sqlite
# ===================================================================

param (
    [Parameter(Mandatory=$false)]
    [string]$BackupFilePath
)

$SourceDir = Split-Path -Parent $PSScriptRoot
$DbFile = Join-Path $SourceDir "data\asu_conference.sqlite"
$BackupDir = Join-Path $SourceDir "backups"

if (-not $BackupFilePath) {
    Write-Host "Available Backups in $BackupDir :" -ForegroundColor Cyan
    $Available = Get-ChildItem -Path $BackupDir -Filter "asu_conference_backup_*.sqlite" | Sort-Object LastWriteTime -Descending
    if ($Available.Count -eq 0) {
        Write-Host "No backup files found in $BackupDir." -ForegroundColor Red
        exit 1
    }
    $Available | Select-Object -First 10 Name, Length, LastWriteTime | Format-Table -AutoSize
    $BackupFilePath = $Available[0].FullName
    Write-Host "Defaulting to most recent backup: $($Available[0].Name)" -ForegroundColor Yellow
}

$Confirmation = Read-Host "Are you sure you want to overwrite active database with $BackupFilePath? (Y/N)"
if ($Confirmation -eq 'Y' -or $Confirmation -eq 'y') {
    # Stop running processes if any
    Write-Host "Stopping service processes..."
    & "$PSScriptRoot\stop-asu-booking.bat"

    Start-Sleep -Seconds 2

    # Remove active WAL and SHM if present
    $Wal = "$DbFile-wal"
    $Shm = "$DbFile-shm"
    if (Test-Path $Wal) { Remove-Item $Wal -Force }
    if (Test-Path $Shm) { Remove-Item $Shm -Force }

    Copy-Item -Path $BackupFilePath -Destination $DbFile -Force
    Write-Host "[SUCCESS] Database restored successfully from $BackupFilePath." -ForegroundColor Green
    Write-Host "You may now restart the service with start-asu-booking.bat." -ForegroundColor Cyan
} else {
    Write-Host "Restoration cancelled by user." -ForegroundColor Gray
}
