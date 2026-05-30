# ============================================
# OneOhm EPC Backend - Production Dockerfile
# Nx Monorepo with Shared Libraries
# ============================================

# Base stage — install ALL deps (dev + prod) for building.
# package*.json and workspace config are copied BEFORE source so that
# the npm ci layer is cached and only re-runs when dependencies change.
FROM node:20-alpine AS base

RUN apk add --no-cache dumb-init

WORKDIR /app

# --- dependency layer (cached unless package*.json changes) ---
# Copy ALL workspace package.json files before npm ci so that npm resolves
# workspace dependencies (e.g. firebase-admin in apps/backend) correctly.
# Without these, npm ci skips workspace packages and their deps are missing.
COPY package*.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY libs/shared/package.json ./libs/shared/package.json
RUN npm ci --ignore-scripts && npm cache clean --force

# --- source layer (invalidates only the build, not the install) ---
COPY tsconfig.base.json ./nx.json ./jest.preset.js ./
COPY apps/backend ./apps/backend/
COPY libs ./libs/

# ============================================
# Development stage
# ============================================
FROM base AS development

WORKDIR /app
ENV NODE_ENV=development
EXPOSE 8085

CMD ["dumb-init", "npx", "nx", "serve", "backend"]

# ============================================
# Build stage
# ============================================
FROM base AS builder

WORKDIR /app

RUN npx nx build backend --configuration=production

RUN ls -la apps/backend/dist/src/ && \
    test -f apps/backend/dist/src/main.js || (echo "Build failed: main.js not found" && exit 1)

# ============================================
# Production stage — lean image, prod deps only
# ============================================
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8085

# --- prod dependency layer (cached unless package*.json changes) ---
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force && \
    rm -rf /root/.npm

# --- built artefacts from builder ---
COPY --from=builder /app/apps/backend/dist ./dist

# Copy shared package for proper module resolution at runtime
RUN mkdir -p node_modules/@oneohm-epc/shared
COPY --from=builder /app/libs/shared/package.json ./node_modules/@oneohm-epc/shared/
COPY --from=builder /app/libs/shared/dist ./node_modules/@oneohm-epc/shared/dist

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 8085

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8085/api/v1', (r) => { process.exit(r.statusCode >= 200 && r.statusCode < 400 ? 0 : 1); }).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/src/main.js"]
