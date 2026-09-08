# syntax=docker/dockerfile:1

# ---------- build ----------
FROM oven/bun:1 AS build
WORKDIR /app

# Build a Node server bundle (not the Cloudflare Worker default)
ENV NITRO_PRESET=node-server
ENV NODE_ENV=production

# Vite env vars are inlined at build time
ARG VITE_ELFSIGHT_REVIEWS_ID=""
ENV VITE_ELFSIGHT_REVIEWS_ID=$VITE_ELFSIGHT_REVIEWS_ID

COPY package.json bun.lock* bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ---------- runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=build /app/.output ./.output

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=10 \
  CMD wget -qO- http://127.0.0.1:3000/api/public/live || exit 1

CMD ["node", ".output/server/index.mjs"]
