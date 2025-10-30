# Base stage
FROM node:20-alpine AS base

WORKDIR /app

# Copy workspace root files
COPY package*.json ./
COPY tsconfig.base.json ./nx.json ./jest.preset.js ./

# Copy backend application
COPY apps/backend ./apps/backend/

# Copy shared libraries
COPY libs ./libs/

# Install all dependencies (including dev dependencies)
RUN npm ci

# Development stage
FROM base AS development

WORKDIR /app

ENV NODE_ENV=development

# Expose port
EXPOSE 8085

# Start application in watch mode
CMD ["npx", "nx", "serve", "backend"]

# Build stage
FROM base AS builder

# Build backend
RUN npx nx build backend

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

# Expose port
EXPOSE 8085

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8085', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main"]
