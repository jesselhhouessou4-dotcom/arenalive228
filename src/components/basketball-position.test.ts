import { describe, expect, it } from "vitest";
import { clampBasketballPosition, migrateBasketballPositions } from "./basketball-position";
import { readPositions, pointerPosition } from "./terrain-position";

describe("basketball half-court positions", () => {
  it("migrates both halves into relative half-court coordinates without folding players together", () => {
    expect(migrateBasketballPositions('{"a":{"x":30,"y":32},"b":{"x":70,"y":68}}', { x: 10, y: 15 })).toEqual({ a: { x: 30, y: 32 }, b: { x: 70, y: 68 } });
  });
  it("keeps legacy edge positions and complete chips inside the smaller court", () => {
    expect(migrateBasketballPositions('{"a":{"x":0,"y":100},"b":{"x":100,"y":0}}', { x: 12, y: 20 })).toEqual({ a: { x: 12, y: 80 }, b: { x: 88, y: 20 } });
  });
  it("does not migrate positions again when the new saved percentages are read", () => {
    const migrated = migrateBasketballPositions('{"a":{"x":25,"y":70}}', { x: 10, y: 15 });
    expect(migrateBasketballPositions(JSON.stringify(migrated), { x: 10, y: 15 })).toEqual(migrated);
  });
  it("clamps default players on narrow mobile half-courts", () => {
    expect(clampBasketballPosition({ x: 90, y: 86 }, { x: 18, y: 25 })).toEqual({ x: 82, y: 75 });
  });
  it("keeps dragging relative to the half-court on different screen sizes", () => {
    expect(pointerPosition(170, 90, { left: 0, top: 0, width: 340, height: 300 }, { x: 10, y: 15 })).toEqual({ x: 50, y: 30 });
    expect(pointerPosition(340, 180, { left: 0, top: 0, width: 680, height: 600 }, { x: 10, y: 15 })).toEqual({ x: 50, y: 30 });
  });
  it("leaves football storage decoding unchanged including edge positions", () => {
    expect(readPositions('{"a":{"x":0,"y":100}}')).toEqual({ a: { x: 0, y: 100 } });
  });
});