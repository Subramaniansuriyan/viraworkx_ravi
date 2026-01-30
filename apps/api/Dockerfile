# ---- Builder stage ----
FROM node:20-slim AS builder
WORKDIR /app

# Copy root workspace config
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/

# Install all dependencies (including dev for build)
RUN npm ci --workspace=apps/api --workspace=packages/db

# Copy source code
COPY packages/db/ packages/db/
COPY apps/api/ apps/api/

# Generate Prisma client
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Build TypeScript
RUN npm run build --workspace=apps/api

# ---- Production stage ----
FROM node:20-slim

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace config for production install
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/packages/db/package.json packages/db/

# Install production dependencies only
RUN npm ci --workspace=apps/api --workspace=packages/db --omit=dev

# Copy Prisma schema and generate client
COPY --from=builder /app/packages/db/ packages/db/
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Copy compiled API code
COPY --from=builder /app/apps/api/dist/ apps/api/dist/

ENV PORT=8080
EXPOSE 8080

CMD ["node", "apps/api/dist/index.js"]
