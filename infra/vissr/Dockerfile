# One VISSR image for the vehicle server, the Crash Monitor Agent and the cloud server.
# VISSR is not copied into this repo: it is cloned from COVESA at a pinned commit, then
#   patches/     our changes that are not upstream yet (each one is, or will be, a VISSR pull request)
#   fordCollab/  the Ford / COVESA files for the demo (CMA, VSS 6.1, Occupant and CVED trees)
# are applied on top. Delete a patch or a fordCollab file once it is in VISSR, and bump VISSR_REF.

#----------------------Builder-----------------------
FROM golang:1.23-bookworm AS builder
ARG VISSR_REPO=https://github.com/COVESA/vissr.git
ARG VISSR_REF=bd3c356b
WORKDIR /build
RUN git clone ${VISSR_REPO} . && git checkout ${VISSR_REF}

COPY patches /patches
RUN for p in /patches/*.patch; do echo "applying $p" && git apply "$p" || exit 1; done

COPY fordCollab/cma client/client-1.0/cma
COPY fordCollab/forest/*.binary server/vissv2server/forest/
COPY fordCollab/viss.him server/vissv2server/viss.him
COPY fordCollab/VssVehicle.cvt fordCollab/VssVehicleScaling.json fordCollab/ammDemoTrip.json feeder/feeder-template/feederv4/

RUN go build -o server/vissv2server/vissv2server ./server/vissv2server && \
	go build -o feeder/feeder-template/feederv4/feederv4 ./feeder/feeder-template/feederv4 && \
	go build -o client/client-1.0/cma/cma ./client/client-1.0/cma

#----------------------Runtime-----------------------
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends memcached ca-certificates && \
	rm -rf /var/lib/apt/lists/*

# the repo layout is kept, the server and feeder use relative paths
WORKDIR /app
COPY --from=builder /build/server /app/server
COPY --from=builder /build/feeder /app/feeder
COPY --from=builder /build/client/client-1.0/cma /app/client/client-1.0/cma

COPY vehicle/trips /app/feeder/feeder-template/feederv4/trips
COPY cloud /app/cloud
COPY start-vehicle.sh start-cma.sh start-cloud.sh /app/
RUN chmod +x /app/*.sh && mkdir -p /var/tmp/vissv2

EXPOSE 8888 8080
