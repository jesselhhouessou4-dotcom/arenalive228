import { describe, expect, it } from "vitest";
import { POSITIONS_BY_SPORT, playerPosition, positionsForSport } from "./positions";
import { footballLine } from "./sports";

describe("Postes par sport", () => {
  it("proposes exactly the requested football positions", () => {
    expect(positionsForSport("football")).toEqual([
      "Gardien", "Défenseur central", "Latéral droit", "Latéral gauche",
      "Milieu défensif", "Milieu central", "Milieu offensif", "Ailier droit", "Ailier gauche", "Avant-centre",
    ]);
  });
  it("proposes exactly the requested basketball positions", () => {
    expect(positionsForSport("basketball")).toEqual(["Meneur", "Arrière", "Ailier", "Ailier fort", "Pivot"]);
  });
  it("keeps players with no position and legacy positions usable", () => {
    expect(playerPosition(null, null)).toBeNull();
    expect(playerPosition(undefined, "GB")).toBe("GB");
    expect(playerPosition("Poste historique", "Gardien")).toBe("Poste historique");
    expect(footballLine(null)).toBe(3);
    expect(footballLine("GB")).toBe(0);
  });
  it("places the new football positions on their field lines", () => {
    expect(POSITIONS_BY_SPORT.football.map(footballLine)).toEqual([0, 1, 1, 1, 2, 2, 2, 3, 3, 3]);
  });
});