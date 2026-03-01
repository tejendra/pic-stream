# Build stage (linux/amd64 for Cloud Run)
FROM --platform=linux/amd64 node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Run stage (linux/amd64 for Cloud Run)
FROM --platform=linux/amd64 node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 8080
# Don't use the base image's entrypoint (avoids exec format issues when arch differs)
ENTRYPOINT []
CMD ["node", "dist/index.js"]
