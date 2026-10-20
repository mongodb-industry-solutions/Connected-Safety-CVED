#!/usr/bin/env bash
# Crash Monitor Agent: subscribes to the airbag on the vehicle server (WebSocket, localhost:8080 because it
# shares the vehicle container's network), sends the crash to the cloud server (HTTP, CMA_CLOUD_URL) and exits.
set -euo pipefail
for _ in $(seq 1 60); do
	(exec 3<>/dev/tcp/localhost/8080) 2>/dev/null && break
	sleep 1
done
cd /app/client/client-1.0/cma
exec ./cma
