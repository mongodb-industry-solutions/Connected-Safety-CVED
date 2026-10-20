# Ford collaboration files

Demo files from the Ford / COVESA collaboration that are not in VISSR yet. The Dockerfile copies them over the VISSR
checkout; delete each one when it is part of VISSR.

| File | Copied to |
|---|---|
| `cma/` Crash Monitor Agent | `client/client-1.0/cma/` |
| `forest/VehicleSignalSpecificationv6.1.binary`, `OccupantSpecificationv0.1.binary`, `CVED_Specificationv0.1.binary` | `server/vissv2server/forest/` |
| `forest/*.yaml` sources of the trees | not copied, for reference |
| `viss.him` vehicle HIM: VSS 6.1, Occupant, CVED, Server trees | `server/vissv2server/viss.him` |
| `VssVehicle.cvt`, `VssVehicleScaling.json` feeder conversion data for VSS 6.1 | `feeder/feeder-template/feederv4/` |
| `ammDemoTrip.json` the Ford trip ending in a crash | `feeder/feeder-template/feederv4/` |

Local changes to `cma/cma.go`, to share with Ford:
- the cloud server URL is read from `CMA_CLOUD_URL` (default `http://0.0.0.0:8888` as in the original), so the agent can
  reach the `vissr-cloud` container;
- `updateEmergencyRequest` skips a get response without a data point (`responseValue`) instead of panicking. It
  happened when the agent polled while the vehicle feeder was still starting.
- the critical message also carries `CVED.AutomatedCrashNotification.CrashIncident.IncidentDateTime`, the timestamp of
  the airbag event on the vehicle server, so the receiver can measure the end-to-end latency.
