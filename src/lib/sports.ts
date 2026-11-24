import type { Database } from "@/integrations/supabase/types";
import { POSITIONS_BY_SPORT } from "./positions";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type EventType = Database["public"]["Enums"]["event_type"];
export type SportId = "football" | "basketball";
export type Match = Tables<"matches">;
export type Team = Tables<"teams">;
export type Player = Tables<"players">;
export type MatchEvent = Tables<"match_events">;
export type Lineup = Tables<"lineups">;

export const EVENT_META: Record<EventType, { label: string; short: string; icon: string }> = {
  debut_match: { label: "Coup d'envoi", short: "Début", icon: "▶" },
  changement_periode: { label: "Nouvelle période", short: "Période", icon: "⏱" },
  fin_match: { label: "Fin du match", short: "Fin", icon: "■" },
  but: { label: "But", short: "But", icon: "⚽" },
  passe_decisive: { label: "Passe décisive", short: "Passe D.", icon: "🅰" },
  carton_jaune: { label: "Carton jaune", short: "Jaune", icon: "🟨" },
  carton_rouge: { label: "Carton rouge", short: "Rouge", icon: "🟥" },
  hors_jeu: { label: "Hors-jeu", short: "H-J", icon: "🚩" },
  remplacement: { label: "Remplacement", short: "Rempl.", icon: "🔁" },
  panier_1: { label: "Lancer franc (+1)", short: "+1", icon: "🏀" },
  panier_2: { label: "Panier (+2)", short: "+2", icon: "🏀" },
  panier_3: { label: "Panier à 3 pts", short: "+3", icon: "🔥" },
  faute_personnelle: { label: "Faute personnelle", short: "Faute", icon: "✋" },
  faute_technique: { label: "Faute technique", short: "Faute T.", icon: "⚠" },
  passe: { label: "Passe décisive", short: "Passe", icon: "🤝" },
  steal: { label: "Interception", short: "Steal", icon: "🫳" },
  block: { label: "Contre", short: "Block", icon: "🛡" },
  rebond: { label: "Rebond", short: "Rebond", icon: "↩" },
  exclusion: { label: "Joueur exclu (5 fautes)", short: "Exclu", icon: "⛔" },
  // Football
  faute: { label: "Faute", short: "Faute", icon: "🛑" },
  faute_main: { label: "Faute de main", short: "Main", icon: "🖐" },
  coup_franc: { label: "Coup franc", short: "Coup franc", icon: "🎯" },
  corner: { label: "Corner", short: "Corner", icon: "📐" },
  touche: { label: "Touche", short: "Touche", icon: "🤾" },
  penalty_accorde: { label: "Penalty accordé", short: "Penalty", icon: "⭕" },
  penalty_manque: { label: "Penalty manqué", short: "Pen. raté", icon: "❌" },
  but_contre_son_camp: { label: "But contre son camp", short: "C.S.C.", icon: "🥅" },
  // Basket
  faute_offensive: { label: "Faute offensive", short: "Faute off.", icon: "💢" },
  faute_antisportive: { label: "Faute antisportive", short: "Antisport.", icon: "🚫" },
  faute_disqualifiante: { label: "Faute disqualifiante", short: "Disqualif.", icon: "🚷" },
  faute_technique_coach: { label: "Faute technique (coach/banc)", short: "Tech. coach", icon: "📣" },
  perte_balle: { label: "Perte de balle", short: "Perte", icon: "💨" },
  temps_mort: { label: "Temps mort", short: "Temps mort", icon: "⏸" },
};

/** Événements sans joueur : un seul appui sur la console, rattachés à l'équipe sélectionnée. */
export const TEAM_ONLY_EVENTS: EventType[] = ["corner", "touche", "temps_mort", "faute_technique_coach"];

/** Événements pour lesquels un joueur est obligatoire (pas de bouton « Sans joueur »). */
export const PLAYER_REQUIRED_EVENTS: EventType[] = [
  "faute",
  "faute_main",
  "penalty_manque",
  "but_contre_son_camp",
  "faute_offensive",
  "faute_antisportive",
  "faute_disqualifiante",
  "perte_balle",
];

/**
 * Basket (FIBA) : fautes qui comptent dans les 5 fautes d'un joueur.
 * Doit rester identique à la fonction SQL on_match_event_change (migration 0005).
 */
export const FOUL_TYPES_FOR_PLAYER_LIMIT: EventType[] = [
  "faute_personnelle",
  "faute_technique",
  "faute_offensive",
  "faute_antisportive",
];

/** Basket : fautes comptées comme fautes d'équipe (la faute technique du coach/banc n'en fait pas partie). */
export const TEAM_FOUL_TYPES: EventType[] = [...FOUL_TYPES_FOR_PLAYER_LIMIT, "faute_disqualifiante"];

/** Après 4 fautes d'équipe dans un quart-temps, la faute suivante donne des lancers francs. */
export const TEAM_FOUL_BONUS_AT = 4;

/** Événements qui sortent un joueur du match. */
const EXCLUSION_TYPES: EventType[] = ["carton_rouge", "exclusion", "faute_disqualifiante"];

export const CONTROL_EVENTS: EventType[] = ["debut_match", "changement_periode", "fin_match"];

export const SPORT_CONFIG: Record<SportId, { label: string; periods: number; emoji: string }> = {
  football: { label: "Football", periods: 2, emoji: "⚽" },
  basketball: { label: "Basketball", periods: 4, emoji: "🏀" },
};

export function periodLabel(sport: string, period: number): string {
  if (period <= 0) return "Avant-match";
  if (sport === "basketball") return period <= 4 ? `QT${period}` : `Prol. ${period - 4}`;
  if (period === 1) return "1re mi-temps";
  if (period === 2) return "2e mi-temps";
  return `Prol. ${period - 2}`;
}

export function eventPoints(type: EventType): number {
  return type === "panier_1" ? 1 : type === "panier_2" ? 2 : type === "panier_3" ? 3 : 0;
}

export function isScoringEvent(sport: string, type: EventType) {
  return sport === "basketball" ? eventPoints(type) > 0 : type === "but" || type === "but_contre_son_camp";
}

/** Score calculé à partir des événements (identique au calcul de la base). */
export function computeScore(sport: string, match: Pick<Match, "team_a_id" | "team_b_id">, events: Pick<MatchEvent, "type" | "team_id">[]) {
  let a = 0;
  let b = 0;
  for (const e of events) {
    // Football : un but contre son camp est crédité à l'adversaire (identique à recompute_match en base).
    if (sport !== "basketball" && e.type === "but_contre_son_camp") {
      if (e.team_id === match.team_a_id) b += 1;
      else if (e.team_id === match.team_b_id) a += 1;
      continue;
    }
    const pts = sport === "basketball" ? eventPoints(e.type) : e.type === "but" ? 1 : 0;
    if (e.team_id === match.team_a_id) a += pts;
    else if (e.team_id === match.team_b_id) b += pts;
  }
  return { a, b };
}

export type StandingRow = {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  scored: number;
  conceded: number;
  diff: number;
  points: number;
};

/** Points : foot 3/1/0 ; basket 2 victoire / 1 défaite (règle FIBA). */
export function computeStandings(sport: string, teams: Team[], matches: Match[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const t of teams)
    rows.set(t.id, { team: t, played: 0, won: 0, drawn: 0, lost: 0, scored: 0, conceded: 0, diff: 0, points: 0 });
  for (const m of matches) {
    if (m.status !== "termine") continue;
    const a = rows.get(m.team_a_id);
    const b = rows.get(m.team_b_id);
    if (!a || !b) continue;
    a.played++;
    b.played++;
    a.scored += m.score_a;
    a.conceded += m.score_b;
    b.scored += m.score_b;
    b.conceded += m.score_a;
    if (m.score_a === m.score_b) {
      a.drawn++;
      b.drawn++;
    } else {
      const [w, l] = m.score_a > m.score_b ? [a, b] : [b, a];
      w.won++;
      l.lost++;
    }
  }
  const win = sport === "basketball" ? 2 : 3;
  const draw = 1;
  const loss = sport === "basketball" ? 1 : 0;
  const list = [...rows.values()].map((r) => ({
    ...r,
    diff: r.scored - r.conceded,
    points: r.won * win + r.drawn * draw + r.lost * loss,
  }));
  return list.sort((x, y) => y.points - x.points || y.diff - x.diff || y.scored - x.scored || x.team.name.localeCompare(y.team.name));
}

/** Joueurs sur le terrain : titulaires ± remplacements. */
export function onFieldPlayerIds(lineups: Lineup[], events: MatchEvent[], teamId: string): Set<string> {
  const ids = new Set(lineups.filter((l) => l.team_id === teamId && l.status === "titulaire").map((l) => l.player_id));
  const subs = events
    .filter((e) => e.team_id === teamId && e.type === "remplacement")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const s of subs) {
    if (s.player_id) ids.delete(s.player_id);
    if (s.related_player_id) ids.add(s.related_player_id);
  }
  for (const e of events)
    if (e.player_id && e.team_id === teamId && EXCLUSION_TYPES.includes(e.type)) ids.delete(e.player_id);
  return ids;
}

export function excludedPlayerIds(events: MatchEvent[]): Set<string> {
  return new Set(
    events.filter((e) => EXCLUSION_TYPES.includes(e.type) && e.player_id).map((e) => e.player_id!),
  );
}

export function countBy(events: MatchEvent[], playerId: string, types: EventType[]) {
  return events.filter((e) => e.player_id === playerId && types.includes(e.type)).length;
}

/** Basket : nombre de fautes d'un joueur comptant dans la limite de 5. */
export function playerFoulCount(events: Pick<MatchEvent, "type" | "player_id">[], playerId: string): number {
  return events.filter((e) => e.player_id === playerId && FOUL_TYPES_FOR_PLAYER_LIMIT.includes(e.type)).length;
}

/** Règle FIBA : les fautes de la prolongation comptent avec celles du 4e quart-temps. */
export function teamFoulPeriod(period: number | null | undefined): number {
  return Math.min(Math.max(period ?? 1, 1), 4);
}

/** Basket : fautes d'une équipe dans une période donnée. */
export function teamFoulsInPeriod(
  events: Pick<MatchEvent, "type" | "team_id" | "period">[],
  teamId: string,
  period: number,
): number {
  const key = teamFoulPeriod(period);
  return events.filter((e) => e.team_id === teamId && TEAM_FOUL_TYPES.includes(e.type) && teamFoulPeriod(e.period) === key).length;
}

export type PlayerStats = Record<string, number>;

export function playerStats(sport: string, events: MatchEvent[], playerId: string): { label: string; value: number }[] {
  const mine = events.filter((e) => e.player_id === playerId);
  const c = (t: EventType) => mine.filter((e) => e.type === t).length;
  const matches = new Set(mine.map((e) => e.match_id)).size;
  if (sport === "basketball") {
    const pts = mine.reduce((s, e) => s + eventPoints(e.type), 0);
    return [
      { label: "Points", value: pts },
      { label: "Paniers à 3", value: c("panier_3") },
      { label: "Rebonds", value: c("rebond") },
      { label: "Passes", value: c("passe") },
      { label: "Interceptions", value: c("steal") },
      { label: "Contres", value: c("block") },
      { label: "Pertes de balle", value: c("perte_balle") },
      {
        label: "Fautes",
        value:
          c("faute_personnelle") + c("faute_technique") + c("faute_offensive") + c("faute_antisportive") + c("faute_disqualifiante"),
      },
      { label: "Matchs (actions)", value: matches },
    ];
  }
  return [
    { label: "Buts", value: c("but") },
    { label: "Passes D.", value: c("passe_decisive") },
    { label: "Cartons jaunes", value: c("carton_jaune") },
    { label: "Cartons rouges", value: c("carton_rouge") },
    { label: "Hors-jeu", value: c("hors_jeu") },
    { label: "Fautes", value: c("faute") + c("faute_main") },
    { label: "Penalties manqués", value: c("penalty_manque") },
    { label: "Buts contre son camp", value: c("but_contre_son_camp") },
    { label: "Matchs (actions)", value: matches },
  ];
}

export const STATUS_LABEL: Record<string, string> = {
  a_venir: "À venir",
  en_cours: "En cours",
  termine: "Terminé",
};

export const FORMAT_LABEL: Record<string, string> = {
  poules: "Poules",
  elimination: "Élimination directe",
};

export const KNOCKOUT_ORDER = ["Huitième de finale", "Quart de finale", "Demi-finale", "Petite finale", "Finale"];

export function footballLine(position: string | null): number {
  const index = POSITIONS_BY_SPORT.football.findIndex((p) => p === position);
  if (index >= 0) return index === 0 ? 0 : index <= 3 ? 1 : index <= 6 ? 2 : 3;
  const p = (position ?? "").toUpperCase();
  if (p.startsWith("GB") || p.includes("GARD")) return 0;
  if (p.startsWith("DEF") || p.includes("DÉF")) return 1;
  if (p.startsWith("MIL")) return 2;
  return 3;
}
