#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_SRC="$PROJECT_DIR/site-ecommerce-docker-compose.service"
SERVICE_DST="/etc/systemd/system/site-ecommerce-docker-compose.service"

if [[ ! -f "$SERVICE_SRC" ]]; then
  echo "Service file not found: $SERVICE_SRC" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed on this machine." >&2
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (or with sudo)."
  exec sudo "$0" "$@"
fi

cp "$SERVICE_SRC" "$SERVICE_DST"
chmod 644 "$SERVICE_DST"

systemctl daemon-reload
systemctl enable --now site-ecommerce-docker-compose.service

systemctl status --no-pager site-ecommerce-docker-compose.service || true

echo
printf 'The project will now start automatically when the server boots.\n'
