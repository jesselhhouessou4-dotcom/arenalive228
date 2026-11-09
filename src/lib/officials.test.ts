import { describe, expect, it } from "vitest";
import { OFFICIALS_BY_SPORT, cleanOfficials, officialsForSport, readOfficials } from "./officials";

describe("officiels", () => {
  it("liste les rôles exacts par sport", () => {
    expect(OFFICIALS_BY_SPORT.football).toEqual(["Arbitre central", "Assistant 1", "Assistant 2", "4e arbitre", "Arbitre VAR", "Chronométreur"]);
    expect(OFFICIALS_BY_SPORT.basketball).toEqual(["Arbitre principal", "Arbitre 1", "Arbitre 2", "Chronométreur", "Marqueur", "Chronométreur 24 secondes"]);
  });
  it("un match sans officiel reste valide", () => {
    expect(readOfficials(null)).toEqual({});
    expect(readOfficials({})).toEqual({});
  });
  it("ne garde que les rôles du sport et les noms remplis", () => {
    expect(cleanOfficials("basketball", { "Arbitre VAR": "X", Marqueur: " Ana ", "Arbitre 1": "  " })).toEqual({ Marqueur: "Ana" });
    expect(officialsForSport("inconnu")).toEqual([]);
  });
});
