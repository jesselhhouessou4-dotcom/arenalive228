import { describe, expect, it } from "vitest";
import {
  EVENT_META,
  TEAM_FOUL_BONUS_AT,
  computeScore,
  computeStandings,
  excludedPlayerIds,
  playerFoulCount,
  playerStats,
  teamFoulsInPeriod,
  type EventType,
  type Match,
  type MatchEvent,
  type Team,
} from "./sports";

const team = (id: string): Team => ({ id, name: id, tournament_id: "t", short_name: null, logo_url: null, color: "#000", group_name: "A", created_at: "", coach: null, assistant_coach: null });
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
    expect(computeStandings("football", [team("A"), team("B")], [m])[0]!.played).toBe(0);
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

const ev = (type: EventType, team_id: string | null, extra: Partial<MatchEvent> = {}) =>
  ({ type, team_id, player_id: null, period: 1, match_id: "m", ...extra }) as MatchEvent;

describe("nouveaux événements football", () => {
  it("un but contre son camp est crédité à l'adversaire", () => {
    const s = computeScore("football", { team_a_id: "A", team_b_id: "B" }, [
      ev("but", "A"),
      ev("but_contre_son_camp", "A"),
      ev("but_contre_son_camp", "B"),
      ev("corner", "A"),
      ev("faute", "B"),
      ev("penalty_manque", "A"),
    ]);
    expect(s).toEqual({ a: 2, b: 1 });
  });
  it("statistiques joueur : fautes, penalties manqués, buts contre son camp", () => {
    const rows = playerStats("football", [
      ev("faute", "A", { player_id: "p1" }),
      ev("faute_main", "A", { player_id: "p1" }),
      ev("penalty_manque", "A", { player_id: "p1" }),
      ev("but_contre_son_camp", "A", { player_id: "p1" }),
    ], "p1");
    const get = (label: string) => rows.find((r) => r.label === label)?.value;
    expect(get("Fautes")).toBe(2);
    expect(get("Penalties manqués")).toBe(1);
    expect(get("Buts contre son camp")).toBe(1);
  });
});

describe("règles basket (FIBA)", () => {
  it("les fautes technique, offensive et antisportive comptent dans les 5 fautes", () => {
    const events = [
      ev("faute_personnelle", "A", { player_id: "p" }),
      ev("faute_technique", "A", { player_id: "p" }),
      ev("faute_offensive", "A", { player_id: "p" }),
      ev("faute_antisportive", "A", { player_id: "p" }),
      ev("faute_technique_coach", "A"),
    ];
    expect(playerFoulCount(events, "p")).toBe(4);
  });
  it("la faute disqualifiante exclut le joueur", () => {
    expect(excludedPlayerIds([ev("faute_disqualifiante", "A", { player_id: "p" })]).has("p")).toBe(true);
  });
  it("fautes d'équipe par quart-temps, prolongation comptée avec le 4e", () => {
    const events = [
      ev("faute_personnelle", "A", { period: 1 }),
      ev("faute_personnelle", "A", { period: 1 }),
      ev("faute_offensive", "A", { period: 2 }),
      ev("faute_technique_coach", "A", { period: 1 }),
      ev("faute_personnelle", "A", { period: 4 }),
      ev("faute_personnelle", "A", { period: 5 }),
      ev("faute_personnelle", "B", { period: 1 }),
    ];
    expect(teamFoulsInPeriod(events, "A", 1)).toBe(2);
    expect(teamFoulsInPeriod(events, "A", 2)).toBe(1);
    expect(teamFoulsInPeriod(events, "A", 4)).toBe(2);
    expect(teamFoulsInPeriod(events, "A", 5)).toBe(2);
    expect(teamFoulsInPeriod(events, "B", 1)).toBe(1);
    expect(TEAM_FOUL_BONUS_AT).toBe(4);
  });
  it("tous les types d'événements ont un libellé", () => {
    for (const t of ["faute", "corner", "touche", "but_contre_son_camp", "perte_balle", "temps_mort"] as EventType[]) {
      expect(EVENT_META[t].label.length).toBeGreaterThan(0);
    }
  });
});
