FROM debian:jessie AS builder

RUN apt-get update && apt-get install -y curl libpq-dev build-essential libssl-dev pkg-config
RUN update-ca-certificates

# Install rust
RUN curl https://sh.rustup.rs/ -sSf | \
  sh -s -- -y --default-toolchain nightly-2020-08-08

ENV PATH="/root/.cargo/bin:${PATH}"

ADD . /root
WORKDIR /root/backend

RUN cargo build --release

FROM debian:jessie

RUN apt-get update && apt-get install -y libpq-dev

COPY --from=builder \
  /root/backend/target/release/quavertrack-backend \
  /usr/local/bin/

RUN apt-get update && apt-get install -y libssl-dev ca-certificates && update-ca-certificates
WORKDIR /root
RUN touch .env
CMD ROCKET_PORT=$PORT /usr/local/bin/quavertrack-backend
