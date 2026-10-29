# Multi-stage production Dockerfile for ASU Conference Hall Booking System
# Supports direct deployment from GitHub to Render, Railway, Fly.io, Docker Hub, or University VPS

FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependency files
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Build frontend production bundle
RUN npm run build

# Production Runner Stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx

# Copy built frontend and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src

# Create database directory
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME /app/data

USER node
EXPOSE 3000

CMD ["tsx", "server.ts"]
