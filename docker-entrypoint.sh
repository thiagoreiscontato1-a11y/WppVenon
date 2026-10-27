#!/bin/sh
set -e
# Volumes are usually mounted owned by root: give the WhatsApp session folder to the app user
mkdir -p /app/tokens "$WHATSAPP_FILES_FOLDER"
chown -R node:node /app/tokens "$WHATSAPP_FILES_FOLDER"
exec setpriv --reuid=node --regid=node --init-groups -- "$@"
