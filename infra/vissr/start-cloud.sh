#!/usr/bin/env bash
# Cloud: VISSR server with only the CVED tree, Memcache as state storage, and the cloud feeder that stores
# every crash in MongoDB (--mongosink) and POSTs it to RTIC 911 (--restsink).
set -euo pipefail
: "${MONGODB_URI:?MONGODB_URI is not set}"

cd /app/server/vissv2server
cp /app/cloud/viss.him viss.him
./vissv2server -s memcache &
SERVER_PID=$!

for _ in $(seq 1 30); do
	[ -S /var/tmp/vissv2/feederReg.sock ] && break
	sleep 1
done

cd /app/feeder/feeder-template/feederv4
REST_ARGS=()
[ -n "${RTIC_ALERT_URL:-}" ] && REST_ARGS=(--restsink "$RTIC_ALERT_URL")
./feederv4 -c /app/cloud/feederConfig.json -d memcache \
	--mongosink --mongodb "${DATABASE_NAME:-connected_safety_cved}" --mongocoll crashes "${REST_ARGS[@]}" &

wait $SERVER_PID
