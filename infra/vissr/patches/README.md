# VISSR patches

Applied in order with `git apply` on top of `VISSR_REF`. Delete a patch once it is in VISSR.

| Patch | What | Upstream |
|---|---|---|
| `01-feederv4-restsink.patch` | feederv4 `--restsink <url>`: POSTs each set request as JSON to an HTTP endpoint (RTIC 911) | to propose |
| `02-server-json-encode-feeder-set.patch` | the server JSON-encodes path and value in the set message to the feeder, so values with quotes (JSON arrays such as the CVED time series) are not dropped | to propose |
| `03-memcache-state-storage.patch` | `-s memcache` looked up its socket under root `Vehicle` instead of `*`; run the init script with `bash` from PATH; memcached as root in containers; the feeder waits for the daemon the server starts | to propose |

The MongoDB sink (`--mongosink`) is already in VISSR (COVESA/vissr#211).

To regenerate a patch: make the change in a VISSR checkout at `VISSR_REF` and `git diff > <patch>`.
