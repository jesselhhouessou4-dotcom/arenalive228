import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_META, CONTROL_EVENTS, footballLine, periodLabel, type Lineup, type MatchEvent, type Player, type Team } from "@/lib/sports";
import type { MatchWithTeams } from "@/lib/queries";
import { LiveClock, LiveDot, PlayerAvatar, TeamBadge, formatDate } from "@/components/common";
import { playerPosition } from "@/lib/positions";
import { LineupTerrain } from "@/components/LineupTerrain";

export function Scoreboard({ match }: { match: MatchWithTeams }) {
  const sport = match.tournament.sport_id;
  const live = match.status === "en_cours";
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card p-5">
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{ background: `linear-gradient(110deg, ${match.team_a.color} 0%, transparent 40%, transparent 60%, ${match.team_b.color} 100%)` }}
      />
      <div className="relative">
        <div className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {match.phase}
          {match.group_name ? ` ${match.group_name}` : ""} · {match.venue ?? match.tournament.name}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Link to="/equipe/$id" params={{ id: match.team_a.id }} className="flex flex-col items-center gap-2 text-center">
            <TeamBadge team={match.team_a} size={60} />
            <span className="font-display text-lg font-bold leading-tight">{match.team_a.name}</span>
          </Link>
          <div className="text-center">
            {match.status === "a_venir" ? (
              <div className="font-display text-2xl font-bold text-muted-foreground">VS</div>
            ) : (
              <div className="font-display text-6xl font-extrabold tabular leading-none">
                {match.score_a}
                <span className="mx-1.5 text-muted-foreground">:</span>
                {match.score_b}
              </div>
            )}
            <div className="mt-2 flex items-center justify-center gap-1.5 text-sm font-bold">
              {live ? (
                <>
                  <LiveDot />
                  <span className="text-live">{periodLabel(sport, match.current_period)}</span>
                  <LiveClock from={match.period_started_at} className="text-foreground" />
                </>
              ) : match.status === "termine" ? (
                <span className="uppercase text-muted-foreground">Terminé</span>
              ) : (
                <span className="text-muted-foreground">{formatDate(match.scheduled_at)}</span>
              )}
            </div>
          </div>
          <Link to="/equipe/$id" params={{ id: match.team_b.id }} className="flex flex-col items-center gap-2 text-center">
            <TeamBadge team={match.team_b} size={60} />
            <span className="font-display text-lg font-bold leading-tight">{match.team_b.name}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function EventFeed({
  match,
  events,
  players,
  onDelete,
}: {
  match: MatchWithTeams;
  events: MatchEvent[];
  players: Map<string, Player>;
  onDelete?: (e: MatchEvent) => void;
}) {
  const sport = match.tournament.sport_id;
  if (!events.length) return <p className="py-6 text-center text-sm text-muted-foreground">Aucun événement pour l'instant.</p>;
  const list = [...events].reverse();
  return (
    <ol className="space-y-2">
      {list.map((e) => {
        const meta = EVENT_META[e.type];
        const control = CONTROL_EVENTS.includes(e.type);
        const p = e.player_id ? players.get(e.player_id) : undefined;
        const rel = e.related_player_id ? players.get(e.related_player_id) : undefined;
        const isA = e.team_id === match.team_a_id;
        const team = isA ? match.team_a : match.team_b;
        if (control)
          return (
            <li key={e.id} className="flex items-center gap-3 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {meta.icon}{" "}
              {e.type === "changement_periode" ? `Début ${periodLabel(sport, e.period ?? 0).toLowerCase()}` : meta.label}
              <span className="h-px flex-1 bg-border" />
              {onDelete && <DeleteBtn onClick={() => onDelete(e)} />}
            </li>
          );
        const highlight = e.type === "but" || e.type === "panier_3" || e.type === "carton_rouge" || e.type === "exclusion";
        return (
          <li
            key={e.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 animate-in fade-in slide-in-from-top-1",
              highlight && "border-primary/40",
              (e.type === "carton_rouge" || e.type === "exclusion") && "border-red-card/50",
            )}
          >
            <span className="w-10 text-center font-display text-sm font-bold text-muted-foreground tabular">
              {sport === "basketball" ? periodLabel(sport, e.period ?? 0) : `${e.minute ?? "–"}'`}
            </span>
            <span className="text-xl">{meta.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {meta.label}
                {e.auto_generated && <span className="ml-1 text-xs font-normal text-muted-foreground">(automatique)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {e.type === "remplacement" ? (
                  <>
                    ↓ {p?.name ?? "?"} · ↑ {rel?.name ?? "?"}
                  </>
                ) : (
                  <>
                    {p ? `#${p.jersey_number ?? ""} ${p.name}` : ""} {p ? "·" : ""} {team?.name}
                  </>
                )}
              </p>
            </div>
            <span className="h-6 w-1.5 rounded-full" style={{ background: team?.color }} />
            {onDelete && !e.auto_generated && <DeleteBtn onClick={() => onDelete(e)} />}
          </li>
        );
      })}
    </ol>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Supprimer l'événement" className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/20 hover:text-destructive">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

type LineupRow = Lineup & { player: Player };

function PlayerChip({ l, cards, sport, compact }: { l: LineupRow; cards: { yellow: number; red: boolean }; sport: string; compact?: boolean }) {
  const size = compact ? 40 : 52;
  return (
    <Link to="/joueur/$id" params={{ id: l.player.id }} className="flex w-16 flex-col items-center gap-1 text-center sm:w-20">
      <div className="relative">
        <PlayerAvatar player={l.player} size={size} className={cn("ring-2 ring-background shadow-lg", cards.red && "opacity-50 grayscale")} />
        <span className="absolute -bottom-1 -left-1 min-w-5 rounded-full bg-background px-1 font-display text-xs font-bold leading-5 text-foreground ring-1 ring-border">
          {l.player.jersey_number ?? "-"}
        </span>
        {l.is_captain && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent font-display text-[11px] font-extrabold text-accent-foreground" title="Capitaine">
            C
          </span>
        )}
        {(cards.yellow > 0 || cards.red) && (
          <span className={cn("absolute -bottom-1 -right-1 h-4 w-3 rounded-sm", cards.red ? "bg-red-card" : "bg-yellow-card")} />
        )}
      </div>
      <span className="w-full truncate text-[11px] font-semibold leading-tight text-foreground drop-shadow">{l.player.name.split(" ").slice(-1)[0]}</span>
      {!compact && playerPosition(l.position, l.player.position) && (
        <span className="w-full break-words text-[10px] leading-tight text-foreground/70">{playerPosition(l.position, l.player.position)}</span>
      )}
      {sport === "basketball" && null}
    </Link>
  );
}

export function LineupBoard({
  team,
  lineups,
  events,
  sport,
  mirrored,
}: {
  team: Team;
  lineups: LineupRow[];
  events: MatchEvent[];
  sport: string;
  mirrored?: boolean;
}) {
  const mine = lineups.filter((l) => l.team_id === team.id);
  const cardsFor = (pid: string) => ({
    yellow: events.filter((e) => e.player_id === pid && e.type === "carton_jaune").length,
    red: events.some((e) => e.player_id === pid && (e.type === "carton_rouge" || e.type === "exclusion")),
  });
  const starters = mine.filter((l) => l.status === "titulaire");
  const bench = mine.filter((l) => l.status === "remplacant");
  const reserve = mine.filter((l) => l.status === "reserve");

  if (!mine.length) return <p className="py-6 text-center text-sm text-muted-foreground">Composition non communiquée.</p>;

  let rows: LineupRow[][];
  if (sport === "football") {
    rows = [0, 1, 2, 3].map((line) => starters.filter((l) => footballLine(playerPosition(l.position, l.player.position)) === line)).filter((r) => r.length);
    if (mirrored) rows = rows.reverse();
  } else {
    rows = [starters.slice(0, 2), starters.slice(2, 5), starters.slice(5)].filter((r) => r.length);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TeamBadge team={team} size={28} />
        <h3 className="font-display text-lg font-bold uppercase">{team.name}</h3>
      </div>
      <LineupTerrain sport={sport} storageKey={`lineup-terrain:${mine[0]?.match_id}:${team.id}:${sport}:${Boolean(mirrored)}`}
        players={rows.flatMap((row, i) => row.map((l, j) => ({
          id: l.id,
          name: l.player.name,
          position: { x: 10 + ((j + 0.5) / row.length) * 80, y: 14 + ((i + 0.5) / rows.length) * 72 },
          chip: <PlayerChip l={l} cards={cardsFor(l.player_id)} sport={sport} />,
        })))} />
      {bench.length > 0 && (
        <div className="rounded-2xl border bg-card p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Banc des remplaçants</p>
          <div className="flex flex-wrap gap-2">
            {bench.map((l) => (
              <PlayerChip key={l.id} l={l} cards={cardsFor(l.player_id)} sport={sport} compact />
            ))}
          </div>
        </div>
      )}
      {reserve.length > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wider">Réserve :</span>{" "}
          {reserve.map((l) => `#${l.player.jersey_number ?? "-"} ${l.player.name}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

export function TeamStatsCompare({ match, events }: { match: MatchWithTeams; events: MatchEvent[] }) {
  const sport = match.tournament.sport_id;
  const types =
    sport === "basketball"
      ? (["panier_3", "panier_2", "panier_1", "rebond", "passe", "steal", "block", "faute_personnelle"] as const)
      : (["but", "passe_decisive", "carton_jaune", "carton_rouge", "hors_jeu", "remplacement"] as const);
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      {types.map((t) => {
        const a = events.filter((e) => e.type === t && e.team_id === match.team_a_id).length;
        const b = events.filter((e) => e.type === t && e.team_id === match.team_b_id).length;
        const total = a + b || 1;
        return (
          <div key={t}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-bold tabular">{a}</span>
              <span className="text-muted-foreground">{EVENT_META[t].label}</span>
              <span className="font-bold tabular">{b}</span>
            </div>
            <div className="flex h-1.5 gap-1">
              <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-secondary">
                <div style={{ width: `${(a / total) * 100}%`, background: match.team_a.color }} />
              </div>
              <div className="flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full" style={{ width: `${(b / total) * 100}%`, background: match.team_b.color }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
