# Build stage
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage — Next.js standalone output (see next.config.ts)
FROM node:24-alpine
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
# node:24-alpine ships whatever Alpine packages it held when Docker Hub last
# rebuilt the tag, which lags Alpine's own security updates by days — long
# enough for the image scan (ADR-0024) to fail on a CVE whose fixed apk is
# already published. Upgrading here takes those fixes at build time instead of
# waiting for the rebuild. Must run before USER node: apk needs root.
RUN apk --no-cache upgrade
# The standalone server runs on `node` alone, so the package managers the
# base image ships are never invoked here — and npm bundles its own
# dependency tree, which is where every Node-package CVE this image has ever
# reported came from (ADR-0024). Removing them fixes that at the source
# instead of waiving each CVE, and drops a package manager from a production
# runtime. Must run before USER node: these are root-owned.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
    /usr/local/lib/node_modules/corepack /usr/local/bin/corepack \
    /opt/yarn-v* /usr/local/bin/yarn /usr/local/bin/yarnpkg
USER node
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
