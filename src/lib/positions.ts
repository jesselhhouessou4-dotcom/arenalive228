export const POSITIONS_BY_SPORT = {
  football: [
    "Gardien", "Défenseur central", "Latéral droit", "Latéral gauche",
    "Milieu défensif", "Milieu central", "Milieu offensif",
    "Ailier droit", "Ailier gauche", "Avant-centre",
  ],
  basketball: ["Meneur", "Arrière", "Ailier", "Ailier fort", "Pivot"],
} as const;

export function positionsForSport(sport: string) : readonly string[] {
  return sport === "football" || sport === "basketball" ? POSITIONS_BY_SPORT[sport] : [];
}

export function playerPosition(lineupPosition: string | null | undefined, defaultPosition: string | null | undefined) {
  return lineupPosition || defaultPosition || null;
}