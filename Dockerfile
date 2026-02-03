# =============================================================================
# Vigilância Web – build a partir da raiz do repositório (EasyPanel)
# Build context: . (raiz)
# =============================================================================

# Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY web/package.json web/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

COPY web/ .
RUN npm run build

# Run
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Script e SQL para init do banco na primeira implantação
COPY --from=builder --chown=nextjs:nodejs /app/scripts/init-db.js ./
COPY --chown=nextjs:nodejs create_schema_app.sql ./

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Aplica schema app no Postgres (idempotente) e inicia a aplicação
CMD ["sh", "-c", "node init-db.js && node server.js"]
