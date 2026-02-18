FROM rust:1.87

WORKDIR /backend

COPY . .

RUN apt-get update && apt-get install -y python3-dev python3-pip build-essential z3 xxd

RUN cargo build --release

CMD ["./target/release/r2u2webserver"]
EXPOSE 443