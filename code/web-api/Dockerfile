# --- build stage -------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
# legacy-peer-deps: pre-existing bullmq <-> redis peer conflict
RUN npm ci --legacy-peer-deps

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- runtime stage -----------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY register-paths.js ./
COPY migrations ./migrations
COPY scripts ./scripts
COPY seeders ./seeders

# `prestart` runs the migrations, then the server boots with the alias resolver.
EXPOSE 3000
CMD ["npm", "start"]
