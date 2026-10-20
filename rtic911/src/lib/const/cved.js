// CVED signals shown by the RTIC 911 dashboard.
export const CVED_PATHS = {
  incidentId: "CVED.AutomatedCrashNotification.CrashIncident.IncidentID",
  plateNumber: "CVED.AutomatedCrashNotification.CrashIncident.CrashVehicle.Registration.PlateNumber",
  claim: "CVED.Context.Claim",
  occupantCount: "CVED.Context.OccupantCount",
  occupantName: "CVED.AutomatedCrashNotification.CrashIncident.CrashPersonRole.Person.PersonFullName",
  occupantWeight: "CVED.Context.Occupant.Weight",
  seatRow: "CVED.Context.Occupant.SeatPosition.Row",
  seatIndex: "CVED.Context.Occupant.SeatPosition.Index",
  rowTotal: "CVED.Context.Vehicle.SeatLayout.RowTotal",
  rowLayout: "CVED.Context.Vehicle.SeatLayout.RowLayout",
  latitude: "CVED.AutomatedCrashNotification.CrashIncident.Location.Latitude",
  longitude: "CVED.AutomatedCrashNotification.CrashIncident.Location.Longitude",
  incidentDateTime: "CVED.AutomatedCrashNotification.CrashIncident.IncidentDateTime",
};

// Sent in the first, critical message.
export const INCIDENT_FIELDS = [
  { label: "Incident ID", path: CVED_PATHS.incidentId },
  { label: "License plate", path: CVED_PATHS.plateNumber },
  { label: "Occupants", path: CVED_PATHS.occupantCount },
  { label: "Latitude", path: CVED_PATHS.latitude, decimals: 5 },
  { label: "Longitude", path: CVED_PATHS.longitude, decimals: 5 },
];

// Sent in the second, contextual message.
export const OCCUPANT_FIELDS = [
  { label: "Name", path: CVED_PATHS.occupantName },
  { label: "Weight", path: CVED_PATHS.occupantWeight, unit: "kg" },
];

// The last values before the crash, oldest first.
export const TIME_SERIES = [
  { label: "Speed", path: "CVED.Context.Vehicle.TimeSeries.Speed", unit: "km/h" },
  { label: "Longitudinal acceleration", path: "CVED.Context.Vehicle.TimeSeries.Acceleration.Longitudinal", unit: "m/s²" },
  { label: "Roll rate", path: "CVED.Context.Vehicle.TimeSeries.AngularVelocity.Roll", unit: "°/s" },
];

export const NOT_AVAILABLE_LABEL = "Not available";

export const ALERT_POLL_INTERVAL_MS = 2000;
