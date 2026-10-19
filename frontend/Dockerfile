# ==============================================================================
# Route Agent Frontend Dockerfile
# Multi-stage build: Node build -> Nginx Alpine static serving + API proxy
# ==============================================================================

# --- Stage 1: Build Application ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for cached layer installation
COPY package.json package-lock.json* ./

# Install exact dependencies
RUN npm ci || npm install

# Copy application source files
COPY . .

# Build production distribution assets
RUN npm run build

# --- Stage 2: Serve Application ---
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built distribution from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA routing and API reverse-proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
