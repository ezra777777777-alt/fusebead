#!/bin/bash
set -euo pipefail
umask 077
cd "$(dirname "$0")"
export PATH="$PWD/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
export NEXT_PUBLIC_API_URL=http://localhost:3001/api
export NEXT_PUBLIC_SITE_URL=http://localhost:3000

fail() {
  echo "$1"
  if [ -t 0 ]; then read -r -p '按回车关闭。' _; fi
  exit 1
}

command -v node >/dev/null || fail '找不到 Node.js，请查看本地使用说明。'
python="$PWD/processor/.venv-mac/bin/python"
[ -x "$python" ] || fail '缺少 Mac Python 环境，请查看本地使用说明。'
[ -f node_modules/next/dist/bin/next ] || fail '缺少前端依赖，请先安装依赖。'
[ -f server/node_modules/typescript/bin/tsc ] || fail '缺少后端依赖，请先安装依赖。'

"$python" - <<'PY' || fail '端口已被占用；请先停止另一个本地网站窗口。'
import socket
for port in (3000, 3001, 5001):
    with socket.socket() as server:
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            server.bind(('127.0.0.1', port))
        except OSError:
            raise SystemExit(f'端口 {port} 不可用')
PY

mkdir -p .local/logs
echo '正在编译后端……'
(cd server && node node_modules/typescript/bin/tsc)

pids=()
cleanup() {
  trap - EXIT INT TERM HUP
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 0' INT TERM HUP

(cd processor && FLASK_DEBUG=0 exec "$python" -m flask --app main run --host 127.0.0.1 --port 5001 --no-reload --no-debugger) >.local/logs/processor-mac.log 2>&1 &
pids+=("$!")
(cd server && export DATABASE_URL='' DB_PATH="$PWD/data/fusebead.db" HOST=127.0.0.1 PORT=3001 PROCESSOR_URL=http://127.0.0.1:5001 MAIL_DELIVERY=local LOCAL_MAIL_DIR="$PWD/../.local/mail" && exec node dist/index.js) >.local/logs/backend-mac.log 2>&1 &
pids+=("$!")
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000 >.local/logs/frontend-mac.log 2>&1 &
pids+=("$!")

for url in http://127.0.0.1:5001/health http://127.0.0.1:3001/api/health http://localhost:3000; do
  ready=0
  for attempt in {1..60}; do
    for pid in "${pids[@]}"; do
      kill -0 "$pid" 2>/dev/null || fail '服务退出，请查看 .local/logs/ 中的 Mac 日志。'
    done
    if curl --silent --fail --max-time 2 "$url" >/dev/null; then ready=1; break; fi
    sleep 1
  done
  [ "$ready" = 1 ] || fail "启动超时：$url；请查看 .local/logs/。"
done

echo '网站已启动：http://localhost:3000'
echo '邮件仅保存到 .local/mail，不向真实邮箱发送。'
echo '保留这个窗口；按 Control+C 停止三个服务。前端改动会自动刷新，后端改动请重启。'
if [ -t 0 ]; then open http://localhost:3000; fi
wait "${pids[2]}"
