import { readPositions, type TerrainPosition } from "./terrain-position";

export function clampBasketballPosition(point: TerrainPosition, inset: TerrainPosition): TerrainPosition {
  const x = Math.min(49, Math.max(0, inset.x));
  const y = Math.min(49, Math.max(0, inset.y));
  return {
    x: Math.max(x, Math.min(100 - x, point.x)),
    y: Math.max(y, Math.min(100 - y, point.y)),
  };
}

// Percentages normalize the whole old board into the new half-board, retaining
// player order and spacing instead of cropping or folding players together.
export function migrateBasketballPositions(value: string | null, inset: TerrainPosition): Record<string, TerrainPosition> {
  return Object.fromEntries(Object.entries(readPositions(value)).map(([id, point]) => [id, clampBasketballPosition(point, inset)]));
}