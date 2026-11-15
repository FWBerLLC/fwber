# Multi-stage Production Dockerfile for fwber-geo (Actix-Web + Geohash + Rayon spatial sidecar)
FROM rust:1.85-bookworm AS builder
WORKDIR /app

COPY Cargo.toml Cargo.lock* ./
COPY src ./src/
RUN cargo build --release

FROM debian:bookworm-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/fwber-geo /usr/local/bin/fwber-geo
ENV RUST_LOG=info

EXPOSE 8081
CMD ["/usr/local/bin/fwber-geo"]
