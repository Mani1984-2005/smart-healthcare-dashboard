# =============================================================================
# Medicare Pro — Backend Production Image
# Multi-stage build: install deps once, ship a slim, non-root runtime image.
# =============================================================================

# ---- deps stage -------------------------------------------------------------
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---- runtime stage ------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime

# tesseract.js downloads a wasm core + language traineddata at runtime;
# vips runtime libs are required by sharp's prebuilt binaries.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libvips42 ca-certificates dumb-init \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=5000 \
    UPLOAD_DIR=/data/uploads

RUN addgroup --system --gid 1001 medcare \
    && adduser --system --uid 1001 --ingroup medcare --home /app medcare

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p /data/uploads \
    && chown -R medcare:medcare /app /data

USER medcare

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
