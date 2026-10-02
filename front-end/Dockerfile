FROM docker.io/oven/bun:1.3.14 AS base
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
# vite.config.ts sets publicDir to ../public; Vite silently skips a missing
# publicDir, which would ship an image without images or favicon (#480).
COPY public/ public/
COPY front-end/ front-end/
COPY package.json tsconfig.json ./
WORKDIR /app/front-end
RUN bunx vite build
# Bundle the production server (and its `shared` imports) into one file.
RUN bun build server/main.ts --target bun --outfile server-dist/main.js

# Production — Bun server: static files + per-article link-preview tags
FROM base AS prod
WORKDIR /app/front-end
COPY --from=build /app/front-end/dist ./dist
COPY --from=build /app/front-end/server-dist/main.js ./server/main.js
EXPOSE 3000
CMD ["bun", "server/main.js"]
