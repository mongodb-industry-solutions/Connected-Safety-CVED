#!/usr/bin/env bash
# Vehicle: VISSR server (VSS 6.1 + Occupant trees) and the trip feeder, Memcache as state storage.
# TRIP selects the trip the feeder plays, every trip ends in a crash.
set -euo pipefail
TRIP=${TRIP:-ammDemoTrip}
TRIP_FILE=trips/$TRIP.json
[ "$TRIP" = "ammDemoTrip" ] && TRIP_FILE=ammDemoTrip.json

cd /app/server/vissv2server
./vissv2server -d -s memcache &
SERVER_PID=$!

for _ in $(seq 1 30); do
	[ -S /var/tmp/vissv2/feederReg.sock ] && break
	sleep 1
done
# give the Crash Monitor Agent time to subscribe to the airbag before the trip starts
sleep "${FEEDER_DELAY:-3}"

echo "Playing trip $TRIP_FILE"
cd /app/feeder/feeder-template/feederv4
./feederv4 -i vssjson -d memcache -t "$TRIP_FILE" &

wait $SERVER_PID
