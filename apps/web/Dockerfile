# ---- Builder stage ----
FROM node:20-slim AS builder
WORKDIR /app

# Copy root workspace config
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/

# Install dependencies
RUN npm ci --workspace=apps/web --workspace=packages/db

# Copy source code
COPY apps/web/ apps/web/
COPY packages/db/ packages/db/

# Build the React app
RUN npm run build --workspace=apps/web

# ---- Production stage ----
FROM nginx:alpine

# Copy built static files
COPY --from=builder /app/apps/web/dist/ /usr/share/nginx/html/

# Copy nginx config template
COPY apps/web/nginx.conf.template /etc/nginx/nginx.conf.template

EXPOSE 8080

# Substitute only API_URL in the nginx config, then start nginx
CMD ["/bin/sh", "-c", "envsubst '${API_URL} ${AI_ENGINE_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
