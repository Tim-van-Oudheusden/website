FROM oven/bun:1 AS base
WORKDIR /app

# Install all workspace dependencies from the monorepo root
FROM base AS deps
COPY package.json bun.lock ./
COPY front-end/package.json front-end/package.json
COPY back-end/package.json back-end/package.json
COPY shared/package.json shared/package.json
RUN bun install --frozen-lockfile || bun install

# Development — Fastify dev server with file watching
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/back-end/node_modules ./back-end/node_modules
COPY shared/ shared/
COPY back-end/ back-end/
COPY package.json tsconfig.json ./
WORKDIR /app/back-end
EXPOSE 3001
CMD ["bun", "run", "--watch", "src/index.ts"]

# Production
FROM base AS prod
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/back-end/node_modules ./back-end/node_modules
COPY shared/ shared/
COPY back-end/ back-end/
COPY package.json tsconfig.json ./
WORKDIR /app/back-end
EXPOSE 3001
CMD ["bun", "run", "src/index.ts"]
