# Multi-stage build for Next.js
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy workspace root files
COPY package*.json ./
COPY tsconfig.base.json ./nx.json ./

# Copy web app
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm ci

# Development stage
FROM base AS development
WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY tsconfig.base.json ./nx.json ./

# Copy all dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy web application
COPY apps/web ./apps/web/

# Copy shared libraries (if web uses them)
COPY libs ./libs/

WORKDIR /app/apps/web

ENV NODE_ENV=development

EXPOSE 3001

# Start Next.js in development mode
CMD ["npm", "run", "dev"]

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

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

# Copy necessary files
COPY --from=builder /app/apps/web/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next && chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
