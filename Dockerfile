# Production image — builds the frontend (root) and runs it served by the
# backend (beacon-backend), matching how this app is actually deployed: one
# Express process that serves both the API and the built frontend's static
# files with an SPA fallback (see beacon-backend/src/server.js). There is no
# separate frontend container/host in production.
#
# Build from the repo root:
#   docker build -t beacon .
# Run (real env vars — MONGODB_URI, ENCRYPTION_KEY, etc. — required; see
# beacon-backend/.env.example for the full list):
#   docker run -p 3001:3001 --env-file beacon-backend/.env beacon

# ── Stage 1: build the frontend ──────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts postcss.config.mjs index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

# ── Stage 2: install backend production dependencies ─────────
FROM node:20-alpine AS backend-deps
WORKDIR /app/beacon-backend
COPY beacon-backend/package.json beacon-backend/package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 3: runtime ──────────────────────────────────────────
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=backend-deps /app/beacon-backend/node_modules ./beacon-backend/node_modules
COPY beacon-backend/package.json ./beacon-backend/package.json
COPY beacon-backend/src ./beacon-backend/src
COPY --from=frontend-build /app/dist ./dist

WORKDIR /app/beacon-backend
EXPOSE 3001
CMD ["node", "src/server.js"]
