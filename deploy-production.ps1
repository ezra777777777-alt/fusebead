param(
    [string]$SshHost = "fusebead-prod"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$remoteScript = @'
set -euo pipefail

repo=/home/admin/fusebead
cd "$repo"

if ! git -c safe.directory="$repo" diff --quiet || \
   ! git -c safe.directory="$repo" diff --cached --quiet; then
  echo "Server repository has tracked changes; deployment stopped."
  git -c safe.directory="$repo" status --short
  exit 20
fi

sudo -n git -c safe.directory="$repo" -C "$repo" fetch origin main
before="$(git -c safe.directory="$repo" rev-parse HEAD)"
after="$(git -c safe.directory="$repo" rev-parse origin/main)"

if [ "$before" != "$after" ]; then
  sudo -n install -d -o admin -g admin -m 700 /home/admin/backups
  stamp="$(date +%F-%H%M%S)"
  backup="/home/admin/backups/fusebead-pre-deploy-$stamp.dump"

  cd "$repo/server"
  node -e 'require("dotenv").config(); const {spawnSync}=require("child_process"); const output=process.argv[1]; const result=spawnSync("pg_dump",[process.env.DATABASE_URL,"--no-owner","--format=custom","--file="+output],{stdio:"inherit"}); process.exit(result.status ?? 1)' "$backup"
  chmod 600 "$backup"
  pg_restore --list "$backup" >/dev/null
  echo "Database backup: $backup"

  sudo -n git -c safe.directory="$repo" -C "$repo" merge --ff-only origin/main
  cd "$repo/server"
  sudo -n npm ci --no-audit --no-fund
  sudo -n npm run build
  sudo -n env PM2_HOME=/root/.pm2 pm2 restart fusebead --update-env
  sudo -n env PM2_HOME=/root/.pm2 pm2 save

  if ! git -c safe.directory="$repo" diff --quiet "$before" "$after" -- processor/; then
    sudo -n systemctl restart fusebead-processor
  fi
else
  echo "Server is already at the latest GitHub revision."
fi

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:3001/api/health >/dev/null && \
     curl -fsS http://127.0.0.1:5000/health >/dev/null; then
    break
  fi
  sleep 1
done

echo "Server revision: $(git -c safe.directory="$repo" rev-parse --short HEAD)"
echo "Express: $(curl -fsS http://127.0.0.1:3001/api/health)"
echo "Processor: $(curl -fsS http://127.0.0.1:5000/health)"
echo "Services: $(systemctl is-active fusebead-processor nginx postgresql | paste -sd, -)"
'$

$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($remoteScript))
& ssh -o BatchMode=yes $SshHost "echo '$encoded' | base64 -d | bash"
if ($LASTEXITCODE -ne 0) {
    throw "Production deployment failed with exit code $LASTEXITCODE"
}

$publicUrls = @(
    "https://www.fusebead.cn",
    "https://www.fusebead.cn/admin",
    "https://api.fusebead.cn/api/health"
)

foreach ($url in $publicUrls) {
    $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing
    if ($response.StatusCode -ne 200) {
        throw "Public check failed: $url returned $($response.StatusCode)"
    }
    Write-Host "Public check passed: $url"
}

Write-Host "Production deployment and health checks completed." -ForegroundColor Green
