import { describe, expect, it } from "vitest";
import { pointerPosition, readPositions } from "./terrain-position";

describe("terrain positions", () => {
  it("stores identical percentage positions on desktop and mobile", () => {
    expect(pointerPosition(250, 400, { left: 0, top: 0, width: 1000, height: 1000 }, { x: 5, y: 5 })).toEqual({ x: 25, y: 40 });
    expect(pointerPosition(100, 160, { left: 0, top: 0, width: 400, height: 400 }, { x: 5, y: 5 })).toEqual({ x: 25, y: 40 });
  });
  it("keeps the entire player inside the terrain", () => {
    expect(pointerPosition(-10, 999, { left: 0, top: 0, width: 400, height: 600 }, { x: 10, y: 8 })).toEqual({ x: 10, y: 92 });
  });
  it("preserves valid saved positions and ignores invalid entries", () => {
    expect(readPositions('{"a":{"x":25,"y":40},"b":{"x":101,"y":40}}')).toEqual({ a: { x: 25, y: 40 } });
    expect(readPositions("broken")).toEqual({});
  });
});