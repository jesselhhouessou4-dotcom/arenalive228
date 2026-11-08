export type ClockState = {
  period_started_at: string | null;
  is_paused?: boolean | null;
  paused_at?: string | null;
  total_paused_seconds?: number | null;
};

export const PAUSE_REASONS = {
  mi_temps: "Mi-temps",
  temps_mort: "Temps mort",
  blessure: "Blessure",
  autre: "Autre",
} as const;
export type PauseReason = keyof typeof PAUSE_REASONS;

/** Temps de jeu (s) de la période : le temps de pause n'est jamais compté. */
export function playedSeconds(m: ClockState, now = Date.now()): number {
  if (!m.period_started_at) return 0;
  const end = m.is_paused && m.paused_at ? new Date(m.paused_at).getTime() : now;
  const raw = (end - new Date(m.period_started_at).getTime()) / 1000;
  return Math.max(0, Math.floor(raw - (m.total_paused_seconds ?? 0)));
}

/** Durée (s) de la pause en cours. */
export function currentPauseSeconds(m: ClockState, now = Date.now()): number {
  if (!m.is_paused || !m.paused_at) return 0;
  return Math.max(0, Math.floor((now - new Date(m.paused_at).getTime()) / 1000));
}

export function fmtSeconds(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
