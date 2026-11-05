FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native node modules (better-sqlite3 / sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache sqlite-libs

ENV NODE_ENV=production
ENV PORT=4000
ENV DB_PATH=/data/apexpulse.db

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY src/db/schema.sql ./src/db/schema.sql

VOLUME ["/data"]
EXPOSE 4000

CMD ["node", "dist/index.js"]
