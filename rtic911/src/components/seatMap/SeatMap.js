"use client";

import { Body, Description } from "@via-ds/components/typography";
import { NOT_AVAILABLE_LABEL } from "@/lib/const/cved.js";

const SEAT_SIZE = 44;
const OCCUPIED_COLOR = "#DB3030"; // same red as the "new" status pill

// Seat position of the occupant, front row at the top, seats left to right as seen from the rear.
// Only the layout of the occupant's row is known, the other rows are drawn with the same number of seats.
export default function SeatMap({ row, index, rowTotal, rowLayout, occupantLabel }) {
  const isKnown = [row, index, rowTotal, rowLayout].every((value) => Number.isInteger(value) && value > 0);
  if (!isKnown) return <Description>Seat position {NOT_AVAILABLE_LABEL.toLowerCase()}</Description>;

  const rows = Array.from({ length: rowTotal }, (_, rowIndex) => rowIndex + 1);
  const seats = Array.from({ length: rowLayout }, (_, seatIndex) => seatIndex + 1);

  return (
    <figure className="flex flex-col items-center gap-2">
      <Description>Front</Description>
      <div
        className="flex flex-col gap-2 p-3 rounded-2xl border"
        style={{ borderColor: "var(--via-color-border-secondary)" }}
        role="img"
        aria-label={`${occupantLabel} in row ${row} of ${rowTotal}, seat ${index} of ${rowLayout}`}
      >
        {rows.map((r) => (
          <div key={r} className="flex gap-2">
            {seats.map((s) => {
              const isOccupied = r === row && s === index;
              return (
                <div
                  key={s}
                  title={isOccupied ? `${occupantLabel}: row ${r}, seat ${s}` : `Row ${r}, seat ${s}`}
                  className="flex items-center justify-center rounded-lg border text-xs font-semibold"
                  style={{
                    width: SEAT_SIZE,
                    height: SEAT_SIZE,
                    borderColor: isOccupied ? OCCUPIED_COLOR : "var(--via-color-border-tertiary)",
                    backgroundColor: isOccupied ? OCCUPIED_COLOR : "transparent",
                    color: isOccupied ? "white" : "var(--via-color-icon-secondary)",
                  }}
                >
                  {isOccupied ? "1" : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <figcaption>
        <Body>
          {occupantLabel}: row {row} of {rowTotal}, seat {index} of {rowLayout}
        </Body>
      </figcaption>
    </figure>
  );
}
