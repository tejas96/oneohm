# Optimized Production Dockerfile for NestJS backend using Nx Pruning
FROM node:20-alpine

RUN apk add --no-cache dumb-init

# Create non-root user BEFORE copying files — avoids a separate chown layer
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8085

# Copy pruned build output with correct ownership — no extra chown layer needed
COPY --chown=nestjs:nodejs dist/ .

# Install production deps using the pruned lockfile
RUN npm ci --omit=dev --no-audit && \
    npm cache clean --force

USER nestjs

EXPOSE 8085

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8085/api/v1', (r) => { process.exit(r.statusCode >= 200 && r.statusCode < 400 ? 0 : 1); }).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]

CMD [ "node", "src/main.js" ]
