FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
COPY ../shared/package.json ../shared/
RUN bun install --frozen-lockfile || bun install

# Development
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0"]

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production — serve static files with bun
FROM base AS prod
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["bun", "run", "preview"]
