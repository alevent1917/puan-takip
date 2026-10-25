# Multi-stage Dockerfile for Oracle Cloud Ubuntu VPS Deployment
# Node.js 22 LTS Alpine
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production runtime image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Run with tsx (or node dist/server.js if transpiled)
CMD ["npx", "tsx", "server.ts"]
