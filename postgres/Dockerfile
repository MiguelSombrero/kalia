FROM postgres:19.0

RUN apt-get update \
    && apt-get install -y --no-install-recommends --only-upgrade zlib1g libzstd1 zstd \
    && rm -rf /var/lib/apt/lists/*
