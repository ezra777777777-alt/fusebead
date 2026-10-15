$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Resolve-NodeHome {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    $commandHome = Split-Path -Parent $node.Source
    if (Test-Path -LiteralPath (Join-Path $commandHome "npm.cmd")) {
      return $commandHome
    }
  }

  $pattern = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_*\node-v*-win-x64\node.exe"
  $candidate = Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if ($candidate) { return $candidate.DirectoryName }
  throw "Node.js was not found. Install the Node.js LTS package first."
}

$nodeHome = Resolve-NodeHome
$npm = Join-Path $nodeHome "npm.cmd"
if (-not (Test-Path -LiteralPath $npm)) { throw "npm was not found beside Node.js: $npm" }

$python = Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"
if (-not (Test-Path -LiteralPath $python)) { throw "Python 3.12 was not found: $python" }

Push-Location $projectRoot
try {
  & $npm ci
  if ($LASTEXITCODE -ne 0) { throw "Frontend dependency installation failed." }
  & $npm run build
  if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }

  Push-Location (Join-Path $projectRoot "server")
  try {
    & $npm ci
    if ($LASTEXITCODE -ne 0) { throw "Backend dependency installation failed." }
    & $npm run build
    if ($LASTEXITCODE -ne 0) { throw "Backend build failed." }
  } finally {
    Pop-Location
  }

  $venv = Join-Path $projectRoot "processor\.venv-local"
  if (-not (Test-Path -LiteralPath (Join-Path $venv "Scripts\python.exe"))) {
    & $python -m venv $venv
    if ($LASTEXITCODE -ne 0) { throw "Python virtual environment creation failed." }
  }
  & (Join-Path $venv "Scripts\python.exe") -m pip install --disable-pip-version-check -r (Join-Path $projectRoot "processor\requirements.txt")
  if ($LASTEXITCODE -ne 0) { throw "Python dependency installation failed." }
} finally {
  Pop-Location
}

Write-Host "FuseBead setup completed successfully."
