# syntax=docker/dockerfile:1


# Define build-time arguments
ARG NODE_VERSION=22

# Build here and pull down all the devDependencies
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY . .
RUN corepack enable
RUN corepack prepare
RUN yarn install
# Apply patches after yarn install
RUN if [ -d patches ] && [ "$(ls -A patches 2>/dev/null)" ]; then yarn patch-package || true; fi
RUN yarn xy build

# Copy patched node_modules from builder stage instead of reinstalling
# This avoids the build issue and preserves the applied patches
FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
# Copy package files needed for runtime
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN corepack enable
RUN corepack prepare
# We'll copy node_modules from builder which already has patches applied

# Copy over the compiled output and production dependencies
# into a slimmer container
# FROM node:${NODE_VERSION}-alpine
FROM node:${NODE_VERSION}
EXPOSE 80
WORKDIR /app
CMD ["node", "./dist/node/index.mjs"]

# Install required packages
# RUN apk add --no-cache file imagemagick ffmpeg
RUN apt-get update && apt-get install -y file imagemagick ffmpeg

COPY --from=dependencies /app/package.json ./package.json
RUN corepack enable
RUN corepack prepare
COPY --from=dependencies /app/.yarn ./.yarn
# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /root/.yarn /root/.yarn
# Apply patch directly using sed (more reliable than patch-package in Docker)
# This makes startJobQueue() non-blocking so server starts even if agenda fails
RUN sed -i 's/await startJobQueue();/startJobQueue().catch((error) => { console.warn("⚠ Job queue (agenda) failed to start (non-critical):", error.message || error); });/' \
    node_modules/@xyo-network/express-node-server/dist/node/index.mjs || true
COPY --from=builder /app/dist/node ./dist/node

