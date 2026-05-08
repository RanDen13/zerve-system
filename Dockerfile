# syntax=docker/dockerfile:1

FROM node:24-slim AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl unoconv libreoffice-writer fontconfig fonts-dejavu fonts-liberation \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

FROM base AS builder

ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/zerve?schema=public

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile --dangerously-allow-all-builds

COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN pnpm exec prisma generate --schema ./prisma/schema.prisma

COPY . .
RUN pnpm run build

FROM base AS runner

ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated/prisma ./generated/prisma

EXPOSE 3000

CMD ["sh", "-c", "node -e \"if(!process.env.DATABASE_URL){throw new Error('DATABASE_URL is required. Set it to your Postgres connection string.')}\" && pnpm exec prisma migrate deploy && pnpm start"]
