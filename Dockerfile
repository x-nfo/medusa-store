# ================================
# Medusa Backend Production Dockerfile
# ================================
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json* yarn.lock* ./
COPY .yarnrc.yml* ./

# Install dependencies
RUN corepack enable && \
    if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm ci; fi

# Copy source files
COPY . .

# Build the application
RUN npm run build

# ================================
# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S medusa && \
    adduser -S medusa -u 1001 -G medusa

# Copy built application from builder
COPY --from=builder --chown=medusa:medusa /app/.medusa/server/ .
COPY --from=builder --chown=medusa:medusa /app/node_modules /app/node_modules
COPY --from=builder --chown=medusa:medusa /app/package.json /app/package.json

# Copy static assets if any
COPY --from=builder --chown=medusa:medusa /app/static /app/static

# Set environment variables
ENV NODE_ENV=production
ENV PORT=9000

# Expose port
EXPOSE 9000

# Switch to non-root user
USER medusa

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9000/health || exit 1

# Start the application
CMD ["npm", "run", "start"]
