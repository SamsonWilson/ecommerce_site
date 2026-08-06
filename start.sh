#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# 1. Detection de l'environnement virtuel Python
if [ -f "$ROOT_DIR/venv/bin/python" ]; then
    VENV_PYTHON="$ROOT_DIR/venv/bin/python"
elif [ -f "$ROOT_DIR/.venv/bin/python" ]; then
    VENV_PYTHON="$ROOT_DIR/.venv/bin/python"
else
    VENV_PYTHON="python3"
fi

# 2. Liberation des ports 8000 et 3000 s'ils sont occupes
echo "[INFO] Liberation des ports 8000 et 3000..."
fuser -k 8000/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
sleep 1

# 3. Preparation des fichiers de logs
BACKEND_LOG="/tmp/marmite-backend.log"
FRONTEND_LOG="/tmp/marmite-frontend.log"
> "$BACKEND_LOG"
> "$FRONTEND_LOG"

# 4. Lancement du Backend Django (mode non-bufferise -u pour logs en direct)
echo "[INFO] Demarrage du Backend sur http://127.0.0.1:8000..."
(cd "$BACKEND_DIR" && "$VENV_PYTHON" -u manage.py runserver 0.0.0.0:8000 --noreload) > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

# 5. Lancement du Frontend Vite
echo "[INFO] Demarrage du Frontend sur http://127.0.0.1:3000..."
(cd "$FRONTEND_DIR" && npm run dev -- --host 0.0.0.0 --port 3000) > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

# 6. Stream des logs dans le terminal en direct
tail -f "$BACKEND_LOG" | sed 's/^/[BACKEND]  /' &
TAIL_BACKEND_PID=$!

tail -f "$FRONTEND_LOG" | sed 's/^/[FRONTEND] /' &
TAIL_FRONTEND_PID=$!

cleanup() {
    echo -e "\n[INFO] Arret des serveurs..."
    kill "$TAIL_BACKEND_PID" "$TAIL_FRONTEND_PID" "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    fuser -k 8000/tcp 2>/dev/null || true
    fuser -k 3000/tcp 2>/dev/null || true
}
trap cleanup EXIT INT TERM

printf "\n=========================================\n"
printf " Backend  : http://127.0.0.1:8000\n"
printf " Frontend : http://127.0.0.1:3000\n"
printf " Appuyez sur Ctrl+C pour arreter les serveurs.\n"
printf "=========================================\n\n"

wait "$BACKEND_PID" "$FRONTEND_PID"
