$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $projectRoot ".local\pids.json"

if (-not (Test-Path -LiteralPath $pidFile)) {
  Write-Host "FuseBead is not running, or no PID file was found."
  exit 0
}

$entries = @(Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json)
function Get-DescendantProcessIds([int]$ParentId) {
  $result = @()
  $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $ParentId" -ErrorAction SilentlyContinue)
  foreach ($child in $children) {
    $result += Get-DescendantProcessIds -ParentId $child.ProcessId
    $result += [int]$child.ProcessId
  }
  return $result
}

foreach ($entry in $entries) {
  $process = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
  if (-not $process) { continue }

  $recorded = [long]$entry.startedAtFileTime
  $actual = $process.StartTime.ToFileTimeUtc()
  if ([math]::Abs($actual - $recorded) -gt 50000000) {
    Write-Warning "Skipped PID $($entry.pid) because it belongs to a newer process."
    continue
  }

  $targets = @(Get-DescendantProcessIds -ParentId $entry.pid) + [int]$entry.pid
  foreach ($target in $targets) {
    Stop-Process -Id $target -Force -ErrorAction SilentlyContinue
  }
  Write-Host "Stopped $($entry.name) (PID $($entry.pid))"
}

Remove-Item -LiteralPath $pidFile -Force
Write-Host "FuseBead stopped."
