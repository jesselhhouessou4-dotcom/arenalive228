import { describe, expect, it } from "vitest";
import { computeScore, computeStandings, type Match, type Team } from "./sports";

const team = (id: string): Team => ({ id, name: id, tournament_id: "t", short_name: null, logo_url: null, color: "#000", group_name: "A", created_at: "" });
const match = (a: string, b: string, sa: number, sb: number): Match =>
  ({ id: a + b, team_a_id: a, team_b_id: b, score_a: sa, score_b: sb, status: "termine" }) as Match;

describe("classement", () => {
  it("football : 3 pts victoire, 1 nul, départage par différence de buts", () => {
    const rows = computeStandings("football", [team("A"), team("B"), team("C")], [match("A", "B", 2, 1), match("B", "C", 0, 0), match("C", "A", 3, 0)]);
    expect(rows.map((r) => [r.team.id, r.points, r.diff])).toEqual([
      ["C", 4, 3],
      ["A", 3, -2],
      ["B", 1, -1],
    ]);
  });
  it("basket : 2 pts victoire, 1 pt défaite", () => {
    const rows = computeStandings("basketball", [team("A"), team("B")], [match("A", "B", 60, 55)]);
    expect(rows.map((r) => r.points)).toEqual([2, 1]);
  });
  it("ignore les matchs non terminés", () => {
    const m = { ...match("A", "B", 1, 0), status: "en_cours" } as Match;
    expect(computeStandings("football", [team("A"), team("B")], [m])[0].played).toBe(0);
  });
});

describe("score calculé depuis les événements", () => {
  it("basket additionne 1/2/3 points", () => {
    const s = computeScore("basketball", { team_a_id: "A", team_b_id: "B" }, [
      { type: "panier_3", team_id: "A" },
      { type: "panier_1", team_id: "A" },
      { type: "panier_2", team_id: "B" },
      { type: "rebond", team_id: "B" },
    ]);
    expect(s).toEqual({ a: 4, b: 2 });
  });
});
