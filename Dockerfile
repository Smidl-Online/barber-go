# BarberGo API — production Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies (npm workspaces hoists to root node_modules)
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN npm ci --ignore-scripts

# Generate Prisma client
COPY apps/api/prisma/schema.prisma apps/api/prisma/
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Build shared + API
FROM deps AS build
COPY packages/shared/ packages/shared/
COPY tsconfig.base.json ./
RUN npm run build --workspace=packages/shared
COPY apps/api/ apps/api/
RUN npm run build --workspace=apps/api

# Production image
FROM node:20-alpine AS production
WORKDIR /app

# Copy hoisted node_modules + built code
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# Entrypoint handles migrations
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "apps/api/dist/apps/api/src/index.js"]
