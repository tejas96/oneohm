# Multi-stage build for Next.js
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy workspace root files
COPY package*.json ./
COPY tsconfig.base.json ./nx.json ./

# Copy web app package.json (if exists)
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Build-time arguments for NEXT_PUBLIC_* variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME=OneOhm EPC

# Set them as environment variables for the build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

COPY --from=deps /app/node_modules ./node_modules

# Copy workspace files
COPY package*.json ./
COPY tsconfig.base.json ./nx.json ./

# Copy web application
COPY apps/web ./apps/web/

# Copy shared libraries (if web uses them)
COPY libs ./libs/

# Build Next.js application
WORKDIR /app/apps/web
RUN npm run build

# Production image
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Automatically leverage output traces to reduce image size
# Copy the standalone build (preserves monorepo structure)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Copy static files to the correct location (relative to server.js in monorepo)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Copy public folder to the correct location
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
