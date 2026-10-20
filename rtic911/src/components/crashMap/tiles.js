const TILE_SIZE = 256;
const ZOOM = 16;
// Tiles around the crash location, enough to fill a map up to 1280 x 768 px.
const TILE_COLUMNS = 5;
const TILE_ROWS = 3;

/**
 * Computes the OpenStreetMap tiles around a location (Web Mercator, slippy map tile names)
 * and the pixel position of the location within the tile grid.
 * @param {number} latitude - Latitude in degrees.
 * @param {number} longitude - Longitude in degrees.
 * @returns {{tiles: {url: string, left: number, top: number}[], markerX: number, markerY: number, tileSize: number}}
 */
export function getTileGrid(latitude, longitude) {
  const tileCount = 2 ** ZOOM;
  const latitudeRad = (latitude * Math.PI) / 180;
  const x = ((longitude + 180) / 360) * tileCount;
  const y = ((1 - Math.log(Math.tan(latitudeRad) + 1 / Math.cos(latitudeRad)) / Math.PI) / 2) * tileCount;

  const firstColumn = Math.floor(x) - Math.floor(TILE_COLUMNS / 2);
  const firstRow = Math.floor(y) - Math.floor(TILE_ROWS / 2);
  const tiles = [];
  for (let row = 0; row < TILE_ROWS; row++) {
    for (let column = 0; column < TILE_COLUMNS; column++) {
      const tileX = (((firstColumn + column) % tileCount) + tileCount) % tileCount;
      const tileY = firstRow + row;
      if (tileY < 0 || tileY >= tileCount) continue;
      tiles.push({
        url: `https://tile.openstreetmap.org/${ZOOM}/${tileX}/${tileY}.png`,
        left: column * TILE_SIZE,
        top: row * TILE_SIZE,
      });
    }
  }
  return {
    tiles,
    markerX: (x - firstColumn) * TILE_SIZE,
    markerY: (y - firstRow) * TILE_SIZE,
    tileSize: TILE_SIZE,
  };
}
