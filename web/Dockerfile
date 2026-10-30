# Manifests stage. The workspaces' package.json files, and nothing else of
# theirs, for the install below: a glob keeps this working while packages/ does
# not exist yet, and deleting the rest keeps the install layer's cache from
# depending on any source file.
FROM node:26-alpine AS manifests
WORKDIR /src
COPY package.json package-lock.json ./
COPY web/package.json web/
COPY [p]ackages packages
RUN mkdir -p packages && find packages -type f ! -name package.json -delete

# Build stage. The context is the repository root, not web/ (ADR-0092): the
# lockfile and the packages are outside web/. `--workspace web` leaves out the
# other workspaces' dependencies.
FROM node:26-alpine AS build
WORKDIR /app
COPY --from=manifests /src ./
RUN npm ci --workspace web
COPY . .
RUN npm run build --workspace web

# Runtime stage — Next.js standalone output (see next.config.ts)
FROM node:26-alpine
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
# node:26-alpine ships whatever Alpine packages it held when Docker Hub last
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
# outputFileTracingRoot is the repository root (next.config.ts), so the
# standalone server sits in web/ inside the output, beside the traced
# node_modules at its root.
COPY --from=build --chown=node:node /app/web/.next/standalone ./
COPY --from=build --chown=node:node /app/web/.next/static ./web/.next/static
EXPOSE 3000
CMD ["node", "web/server.js"]
