FROM oven/bun:1 AS base
WORKDIR /app

# Install all workspace dependencies from the monorepo root
FROM base AS deps
COPY package.json bun.lock ./
COPY front-end/package.json front-end/package.json
COPY back-end/package.json back-end/package.json
COPY shared/package.json shared/package.json
RUN bun install --frozen-lockfile

# Development — Vite dev server with HMR
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY shared/ shared/
COPY front-end/ front-end/
COPY back-end/package.json back-end/package.json
COPY package.json tsconfig.json ./
WORKDIR /app/front-end
EXPOSE 5173
CMD ["sh", "-c", "cd /app && bun install --frozen-lockfile && cd /app/front-end && bunx vite --host 0.0.0.0"]

# Build — production build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/front-end/node_modules ./front-end/node_modules
COPY shared/ shared/
COPY front-end/ front-end/
COPY package.json tsconfig.json ./
WORKDIR /app/front-end
RUN bunx vite build

# Production — serve static files
FROM base AS prod
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/front-end/node_modules ./front-end/node_modules
COPY --from=build /app/front-end/dist ./dist
EXPOSE 3000
CMD ["./node_modules/.bin/serve", "-s", "dist", "-l", "3000"]
