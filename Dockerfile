# Multi-stage production Dockerfile for First Faith unified application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configurations
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --prefix backend
RUN npm ci --prefix frontend

# Copy Prisma schema and generate client
COPY backend/prisma ./backend/prisma
RUN npm run prisma:generate --prefix backend

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build backend and frontend
RUN npm run build --prefix backend
ENV NODE_ENV=production
RUN npm run build --prefix frontend

# ---- Runner Stage ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy root package metadata
COPY package*.json ./
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma

# Copy frontend build and production dependencies
COPY --from=builder /app/frontend/package*.json ./frontend/
COPY --from=builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/next.config.js ./frontend/

EXPOSE 4000

CMD ["node", "backend/dist/src/main.js"]
