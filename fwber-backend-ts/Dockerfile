# Multi-stage Production Dockerfile for fwber-backend-ts (Express + TypeScript + Prisma + Socket.IO)
FROM node:24-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --no-audit --no-fund
RUN npx prisma generate

COPY tsconfig.json VERSION ./
COPY src ./src/
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4003

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/VERSION ./VERSION
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/dist ./dist/
RUN mkdir -p /app/uploads

EXPOSE 4003
CMD ["node", "dist/index.js"]
