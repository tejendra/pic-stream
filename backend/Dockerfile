# Build from repo root: docker build -f backend/Dockerfile .
# Build stage (linux/amd64 for Cloud Run)
FROM --platform=linux/amd64 node:20-alpine AS builder

WORKDIR /app

# Copy shared package and build it first (backend depends on file:../shared)
COPY shared/package.json shared/tsconfig.json shared/types.ts shared/index.ts ./shared/
RUN cd shared && npm install && npm run build

# Copy backend into app/backend so file:../shared resolves to app/shared
COPY backend/package.json backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
WORKDIR /app/backend
RUN npm install
RUN npm run build

# Run stage (linux/amd64 for Cloud Run)
FROM --platform=linux/amd64 node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Lay out shared and backend so file:../shared resolves
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/package.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev
COPY --from=builder /app/backend/dist ./dist

EXPOSE 8080
ENTRYPOINT []
CMD ["node", "dist/index.js"]
