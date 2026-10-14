param(
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$stateDir = Join-Path $projectRoot ".local"
$logDir = Join-Path $stateDir "logs"
$pidFile = Join-Path $stateDir "pids.json"

function Resolve-Node {
  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $pattern = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_*\node-v*-win-x64\node.exe"
  $candidate = Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if ($candidate) { return $candidate.FullName }

  throw "Node.js was not found. Run setup-local.ps1 first."
}

function Wait-Url([string]$Name, [string]$Url) {
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Write-Host "[OK] $Name - $Url"
        return
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  throw "$Name did not become ready: $Url"
}

if (Test-Path -LiteralPath $pidFile) {
  $active = @()
  foreach ($entry in @(Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json)) {
    if (Get-Process -Id $entry.pid -ErrorAction SilentlyContinue) { $active += $entry }
  }
  if ($active.Count -gt 0) {
    Write-Host "FuseBead is already running."
    Write-Host "Website: http://localhost:3000"
    Write-Host "Admin:   http://localhost:3000/admin"
    exit 0
  }
}

$node = Resolve-Node
$python = Join-Path $projectRoot "processor\.venv-local\Scripts\python.exe"
$nextCli = Join-Path $projectRoot "node_modules\next\dist\bin\next"
$serverEntry = Join-Path $projectRoot "server\dist\index.js"

foreach ($required in @($python, $nextCli, $serverEntry)) {
  if (-not (Test-Path -LiteralPath $required)) {
    throw "Missing required file: $required. Run setup-local.ps1 first."
  }
}

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$services = @(
  @{ Name = "processor"; File = $python; Args = @("main.py"); WorkDir = (Join-Path $projectRoot "processor") },
  @{ Name = "backend"; File = $node; Args = @($serverEntry); WorkDir = (Join-Path $projectRoot "server") },
  @{ Name = "frontend"; File = $node; Args = @($nextCli, "start", "-p", "3000"); WorkDir = $projectRoot }
)

$started = @()
foreach ($service in $services) {
  $stdout = Join-Path $logDir ($service.Name + ".out.log")
  $stderr = Join-Path $logDir ($service.Name + ".err.log")
  $process = Start-Process -FilePath $service.File -ArgumentList $service.Args `
    -WorkingDirectory $service.WorkDir -WindowStyle Hidden `
    -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
  $started += [pscustomobject]@{
    name = $service.Name
    pid = $process.Id
    startedAtFileTime = $process.StartTime.ToFileTimeUtc()
  }
}

$started | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8

try {
  Wait-Url "Image processor" "http://127.0.0.1:5000/health"
  Wait-Url "Backend API" "http://127.0.0.1:3001/api/health"
  Wait-Url "Frontend" "http://127.0.0.1:3000"
} catch {
  Write-Host $_.Exception.Message
  Write-Host "Check logs in $logDir"
  & (Join-Path $projectRoot "stop-local.ps1")
  throw
}

Write-Host ""
Write-Host "FuseBead is ready."
Write-Host "Website: http://localhost:3000"
Write-Host "Admin:   http://localhost:3000/admin"
Write-Host "API:     http://localhost:3001/api/health"

if ($OpenBrowser) {
  Start-Process "http://localhost:3000"
}
