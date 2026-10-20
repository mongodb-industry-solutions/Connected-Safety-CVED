"use client";

import { Description, Disclaimer } from "@via-ds/components/typography";
import { getTileGrid } from "./tiles";

export default function CrashMap({ location }) {
  if (!location) {
    return <Description>Crash location not available.</Description>;
  }
  const [longitude, latitude] = location.coordinates;
  const { tiles, markerX, markerY, tileSize } = getTileGrid(latitude, longitude);

  return (
    <div
      className="relative w-full h-72 overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--via-color-border-primary)" }}
    >
      {/* the tile grid is shifted so that the crash location is in the center of the map */}
      <div className="absolute" style={{ left: `calc(50% - ${markerX}px)`, top: `calc(50% - ${markerY}px)` }}>
        {tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.url}
            src={tile.url}
            alt=""
            width={tileSize}
            height={tileSize}
            className="absolute max-w-none"
            style={{ left: tile.left, top: tile.top }}
          />
        ))}
      </div>
      <div
        aria-label={`Crash location ${latitude}, ${longitude}`}
        className="absolute left-1/2 top-1/2 w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4"
        style={{ backgroundColor: "#DB3030", borderColor: "white", boxShadow: "0 0 0 6px rgba(219, 48, 48, 0.3)" }}
      />
      <div className="absolute bottom-0 right-0 px-1" style={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}>
        <Disclaimer>© OpenStreetMap contributors</Disclaimer>
      </div>
    </div>
  );
}
