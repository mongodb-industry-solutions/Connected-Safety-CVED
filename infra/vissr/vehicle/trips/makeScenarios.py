#!/usr/bin/env python3
#
# Generates the crash scenario trips for the CVED crash demo (crashDemo.sh crash <scenario>).
# Every trip drives 9 steps from start to crash location, the airbag is released in the last step.
# The time series signals hold the last three values before the crash as a JSON array; they are set
# one step before the airbag is released, because the Crash Monitor Agent sends the values it read
# just before the airbag release.
# All persons, vehicles and plates are fictitious.

import json
import os

STEPS = 9
TS = ["2020-04-15T13:37:%02dZ" % (i * 5) for i in range(STEPS)]

SCENARIOS = {
    "helsingor": {
        "description": "Frontal collision on Flynderborgvej, Helsingør, driver alone",
        "vin": "1FA6P8CF0H1234567", "plate": "EJ16968",
        "start": (56.02024719364729, 12.599927977070497), "crash": (56.02823595803967, 12.603616368784676),
        "occupants": 1, "name": "Anna Jensen", "weight": 62,
        "seat": [1, 1, 2, 2],
        "speed": [120, 118, 119, 120, 122, 120, 118, 95, 75],
        "acceleration": [0.5, -0.5, 0.5, 0.5, 1.5, -0.5, -1.5, -3.5, -7.5],
        "roll": [0, 0, 0, 0, 0, 0, 0, 0.5, 2.5],
    },
    "copenhagen": {
        "description": "Side impact at an intersection in Copenhagen, family of four, child in the rear middle seat",
        "vin": "WF0XXXGCDX7654321", "plate": "CV41207",
        "start": (55.68140, 12.57900), "crash": (55.68420, 12.58550),
        "occupants": 4, "name": "Emil Hansen", "weight": 24,
        "seat": [2, 2, 2, 3],
        "speed": [45, 48, 50, 47, 42, 50, 50, 38, 20],
        "acceleration": [0.5, 0.5, 0.2, -0.8, -1.2, 1.0, 0.0, -2.5, -9.0],
        "roll": [0, 0, 0, 0, 0, 0, 0, 3.5, 18.0],
    },
    "rollover": {
        "description": "Rollover on a rural road near Höör, Sweden, passenger in a 7-seat van, middle seat of row 2",
        "vin": "1FTBR3X82PKA24680", "plate": "MKR 482",
        "start": (55.93500, 13.52000), "crash": (55.94300, 13.53400),
        "occupants": 3, "name": "Sofia Lindqvist", "weight": 71,
        "seat": [2, 2, 3, 3],
        "speed": [90, 92, 91, 93, 95, 94, 92, 85, 64],
        "acceleration": [0.2, 0.3, 0.0, 0.4, 0.5, -0.2, -0.5, -4.0, -6.5],
        "roll": [0, 0, 0.5, 0, 0, 1.0, 2.0, 35.0, 140.0],
    },
    "dearborn": {
        "description": "Rear-end collision on Michigan Avenue, Dearborn, driver alone",
        "vin": "1FMCU9J98PUA13579", "plate": "8KLM392",
        "start": (42.30700, -83.23300), "crash": (42.30690, -83.22050),
        "occupants": 1, "name": "Marcus Reed", "weight": 88,
        "seat": [1, 1, 2, 2],
        "speed": [64, 66, 65, 60, 58, 62, 60, 52, 31],
        "acceleration": [0.2, 0.3, -0.5, -1.0, 0.0, 0.5, -0.4, -3.0, -8.0],
        "roll": [0, 0, 0, 0, 0, 0, 0, 0.5, 1.5],
    },
}


def series(path, values):
    return {"path": path, "dp": [{"ts": ts, "value": str(v)} for ts, v in zip(TS, values)]}


def constant(path, value):
    return series(path, [value] * STEPS)


def time_series(path, values):
    values = [str(v) for v in values]
    last_three = json.dumps(values[-3:]).replace('","', '", "')
    values[-2] = last_three
    values[-1] = last_three
    return {"path": path, "dp": [{"ts": ts, "value": v} for ts, v in zip(TS, values)]}


def trip(s):
    (lat0, lon0), (lat1, lon1) = s["start"], s["crash"]
    lat = [round(lat0 + (lat1 - lat0) * i / (STEPS - 1), 6) for i in range(STEPS)]
    lon = [round(lon0 + (lon1 - lon0) * i / (STEPS - 1), 6) for i in range(STEPS)]
    row, index, row_total, row_layout = s["seat"]
    claim = f"This is an emergency event message sent from the vehicle with VIN={s['vin']} and license plate number={s['plate']}"
    return [
        series("Vehicle.Safety.Airbag.IsReleased", ["false"] * (STEPS - 1) + ["true"]),
        series("Vehicle.CurrentLocation.Latitude", lat),
        series("Vehicle.CurrentLocation.Longitude", lon),
        time_series("Vehicle.Speed", s["speed"]),
        time_series("Vehicle.Acceleration.Longitudinal", s["acceleration"]),
        time_series("Vehicle.AngularVelocity.Roll", s["roll"]),
        constant("Vehicle.VehicleIdentification.LicensePlate", s["plate"]),
        constant("Vehicle.VehicleIdentification.Claim", claim),
        constant("Vehicle.Occupant.Count", s["occupants"]),
        constant("Vehicle.Cabin.Seat.Row1.DriverSide.Weight", s["weight"]),
        constant("Occupant1.Identification.Name", s["name"]),
        constant("Occupant1.Position.SeatPosition.Row", row),
        constant("Occupant1.Position.SeatPosition.Index", index),
        constant("Occupant1.Position.SeatLayout.RowTotal", row_total),
        constant("Occupant1.Position.SeatLayout.RowLayout", row_layout),
    ]


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    for name, scenario in SCENARIOS.items():
        with open(os.path.join(here, name + ".json"), "w") as f:
            json.dump(trip(scenario), f, indent=1)
            f.write("\n")
        print(f"{name}: {scenario['description']}")
