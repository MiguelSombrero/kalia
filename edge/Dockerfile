FROM nginxinc/nginx-unprivileged:1.30.6-alpine

# The base image lags Alpine's own security updates, long enough for the image
# scan (ADR-0024) to fail on a CVE whose fixed package is already published
# (brotli-libs and curl on 1.30.6-alpine); frontend/Dockerfile upgrades for the
# same reason. Must run before USER nginx: apk needs root.
USER root
RUN apk --no-cache upgrade
USER nginx

COPY nginx.conf /etc/nginx/nginx.conf
