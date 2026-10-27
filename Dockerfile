# ---------- build ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=1 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY web/package.json web/package-lock.json web/
RUN cd web && npm ci

COPY . .
RUN npm run build && npm run web:build && npm prune --omit=dev

# ---------- runtime ----------
FROM node:20-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    CHROME_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    WHATSAPP_FILES_FOLDER=/tmp/whatsapp-files \
    TRUST_PROXY=1

WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/dist dist
COPY --from=build /app/web/dist web/dist
COPY docker-entrypoint.sh /usr/local/bin/

# WhatsApp session (keeps you logged in between deploys): mount a volume here
VOLUME /app/tokens
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main"]
