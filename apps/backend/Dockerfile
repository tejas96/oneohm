# ============================================
# OneOhm EPC Backend - Production Dockerfile
# Nx Monorepo with Shared Libraries
# ============================================

# Base stage - Install dependencies
FROM node:20-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy workspace root files
COPY package*.json ./
COPY tsconfig.base.json ./nx.json ./jest.preset.js ./

# Copy backend application
COPY apps/backend ./apps/backend/

# Copy shared libraries (required by backend)
COPY libs ./libs/

# Install all dependencies (including dev dependencies for build)
RUN npm ci --ignore-scripts && npm cache clean --force

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

# Build backend with all dependencies (Nx builds shared libs too)
RUN npx nx build backend --configuration=production

# Verify build outputs exist
RUN ls -la apps/backend/dist/src/ && \
    test -f apps/backend/dist/src/main.js || (echo "Build failed: main.js not found" && exit 1)

# ============================================
# Production stage
# ============================================
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8085

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force && \
    rm -rf /root/.npm

# Copy built backend application
COPY --from=builder /app/apps/backend/dist ./dist

# Copy built shared libraries to node_modules for proper resolution
# This creates the @oneohm-epc scope in node_modules
RUN mkdir -p node_modules/@oneohm-epc
COPY --from=builder /app/dist/libs/shared-types ./node_modules/@oneohm-epc/shared-types
COPY --from=builder /app/dist/libs/shared-utils ./node_modules/@oneohm-epc/shared-utils

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 8085

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8085/api/v1', (r) => { process.exit(r.statusCode >= 200 && r.statusCode < 400 ? 0 : 1); }).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/src/main.js"]
