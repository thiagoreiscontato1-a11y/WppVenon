#!/bin/bash
# Starts the API in background (runs every time you open the Codespace).
# Use --rebuild after pulling new code.
cd "$(dirname "$0")/.."
LOG=/tmp/wppvenon.log
PIDFILE=/tmp/wppvenon.pid

if [ "$1" = "--rebuild" ]; then
  [ -f $PIDFILE ] && kill "$(cat $PIDFILE)" 2>/dev/null && sleep 2
  npm ci && (cd web && npm ci) && npm run build && npm run web:build || exit 1
fi

if curl -s -o /dev/null http://localhost:3000/api/auth/me; then
  echo "WppVenon já está rodando."
else
  nohup node dist/main >> $LOG 2>&1 &
  echo $! > $PIDFILE
  echo "Iniciando WppVenon (logs: tail -f $LOG)..."
  for _ in $(seq 1 30); do
    curl -s -o /dev/null http://localhost:3000/api/auth/me && break
    sleep 1
  done
  if ! curl -s -o /dev/null http://localhost:3000/api/auth/me; then
    echo "A API não subiu. Últimas linhas do log:"
    tail -20 $LOG
    exit 1
  fi
fi

USER_NAME=${ADMIN_USER:-$(grep -s '^ADMIN_USER=' .env | cut -d= -f2-)}
PASSWORD=${ADMIN_PASSWORD:+(definida no secret ADMIN_PASSWORD)}
PASSWORD=${PASSWORD:-$(grep -s '^ADMIN_PASSWORD=' .env | cut -d= -f2-)}
echo
echo "=============================================================="
echo " WppVenon no ar!"
if [ -n "$CODESPACE_NAME" ]; then
  echo " Abra: https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/"
else
  echo " Abra: http://localhost:3000/"
fi
echo " Usuário: ${USER_NAME:-admin}"
echo " Senha:   ${PASSWORD}"
echo "=============================================================="
