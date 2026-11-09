/** Rôles d'officiels par sport — liste unique utilisée partout. */
export const OFFICIALS_BY_SPORT = {
  football: ["Arbitre central", "Assistant 1", "Assistant 2", "4e arbitre", "Arbitre VAR", "Chronométreur"],
  basketball: ["Arbitre principal", "Arbitre 1", "Arbitre 2", "Chronométreur", "Marqueur", "Chronométreur 24 secondes"],
} as const;

export type Officials = Record<string, string>;

export function officialsForSport(sport: string | null | undefined): readonly string[] {
  return OFFICIALS_BY_SPORT[sport as keyof typeof OFFICIALS_BY_SPORT] ?? [];
}

/** Lit la valeur stockée (peut être null, vide ou mal formée) sans planter. */
export function readOfficials(value: unknown): Officials {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Officials = {};
  for (const [k, v] of Object.entries(value)) if (typeof v === "string" && v.trim()) out[k] = v;
  return out;
}

/** Garde uniquement les rôles du sport avec un nom non vide. */
export function cleanOfficials(sport: string, value: Officials): Officials {
  const out: Officials = {};
  for (const role of officialsForSport(sport)) {
    const name = value[role]?.trim();
    if (name) out[role] = name;
  }
  return out;
}
