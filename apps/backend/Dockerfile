# Optimized Production Dockerfile for NestJS backend using Nx Pruning
FROM node:20-alpine AS deps

WORKDIR /app

# Build tools only in the deps stage (bcrypt native compile on Alpine)
RUN apk add --no-cache python3 make g++

COPY dist/ .

RUN npm ci --omit=dev --no-audit && \
    npm cache clean --force && \
    find node_modules -type f \( \
      -name '*.map' -o -name '*.md' -o -name '*.markdown' -o \
      -name 'LICENSE' -o -name 'LICENSE.md' -o -name 'LICENSE.txt' -o \
      -name 'CHANGELOG.md' -o -name 'CHANGELOG' \
    \) -delete && \
    find node_modules -type d \( \
      -name '__tests__' -o -name 'test' -o -name 'tests' -o \
      -name 'docs' -o -name 'doc' -o -name 'examples' -o -name 'example' \
    \) -prune -exec rm -rf '{}' +

FROM node:20-alpine

RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8085

COPY --from=deps --chown=nestjs:nodejs /app .

USER nestjs

EXPOSE 8085

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8085/api/v1', (r) => { process.exit(r.statusCode >= 200 && r.statusCode < 400 ? 0 : 1); }).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]

CMD [ "node", "src/main.js" ]
