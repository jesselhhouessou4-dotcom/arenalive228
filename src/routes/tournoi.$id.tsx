import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { matchesQuery, teamsQuery, tournamentQuery, useRealtime, type MatchWithTeams } from "@/lib/queries";
import { Empty, ErrorBox, LoadingList, MatchCard, TeamBadge, formatDate } from "@/components/common";
import { FORMAT_LABEL, KNOCKOUT_ORDER, SPORT_CONFIG, STATUS_LABEL, computeStandings, type SportId, type Team } from "@/lib/sports";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tournoi/$id")({
  head: () => ({
    meta: [
      { title: "Tournoi — calendrier et classement" },
      { name: "description", content: "Calendrier, classement des poules et tableau des phases finales." },
      { property: "og:title", content: "Tournoi — calendrier et classement" },
      { property: "og:description", content: "Calendrier, classement des poules et phases finales." },
    ],
  }),
  component: TournamentPage,
});

function TournamentPage() {
  const { id } = Route.useParams();
  const t = useQuery(tournamentQuery(id));
  const teams = useQuery(teamsQuery(id));
  const matches = useQuery(matchesQuery({ tournamentId: id }));
  useRealtime("matches", `tournament_id=eq.${id}`, [["matches", { tournamentId: id }]]);

  if (t.isLoading) return <LoadingList />;
  if (t.error) return <ErrorBox error={t.error} onRetry={() => t.refetch()} />;
  const tour = t.data!;
  const sport = tour.sport_id;
  const all = matches.data ?? [];
  const groupMatches = all.filter((m) => m.phase === "Poule");
  const knockout = all.filter((m) => m.phase !== "Poule");
  const groups = [...new Set((teams.data ?? []).map((tm) => tm.group_name ?? "Unique"))].sort();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">
          {SPORT_CONFIG[sport as SportId]?.emoji} {SPORT_CONFIG[sport as SportId]?.label} · {FORMAT_LABEL[tour.format]}
        </p>
        <h1 className="font-display text-3xl font-extrabold uppercase leading-tight">{tour.name}</h1>
        <p className="text-sm text-muted-foreground">
          {STATUS_LABEL[tour.status]} · {formatDate(tour.start_date, false)} → {formatDate(tour.end_date, false)}
        </p>
      </div>

      <Tabs defaultValue="calendrier">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendrier">Matchs</TabsTrigger>
          <TabsTrigger value="classement">Classement</TabsTrigger>
          <TabsTrigger value="finales">Finales</TabsTrigger>
          <TabsTrigger value="equipes">Équipes</TabsTrigger>
        </TabsList>

        <TabsContent value="calendrier" className="mt-4 space-y-3">
          {matches.isLoading ? (
            <LoadingList />
          ) : matches.error ? (
            <ErrorBox error={matches.error} />
          ) : all.length ? (
            all.map((m) => <MatchCard key={m.id} match={m} />)
          ) : (
            <Empty>Aucun match programmé.</Empty>
          )}
        </TabsContent>

        <TabsContent value="classement" className="mt-4 space-y-5">
          {groups.map((g) => (
            <StandingsTable
              key={g}
              title={g === "Unique" ? "Classement" : `Poule ${g}`}
              sport={sport}
              teams={(teams.data ?? []).filter((tm) => (tm.group_name ?? "Unique") === g)}
              matches={groupMatches}
            />
          ))}
          <p className="text-xs text-muted-foreground">
            {sport === "basketball" ? "Victoire 2 pts · Défaite 1 pt." : "Victoire 3 pts · Nul 1 pt · Défaite 0 pt."} Départage : différence, puis
            {sport === "basketball" ? " points marqués." : " buts marqués."}
          </p>
        </TabsContent>

        <TabsContent value="finales" className="mt-4">
          <Bracket matches={knockout} />
        </TabsContent>

        <TabsContent value="equipes" className="mt-4 grid grid-cols-2 gap-3">
          {(teams.data ?? []).map((tm) => (
            <Link key={tm.id} to="/equipe/$id" params={{ id: tm.id }} className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center">
              <TeamBadge team={tm} size={56} />
              <span className="font-semibold">{tm.name}</span>
              {tm.group_name && <span className="text-xs text-muted-foreground">Poule {tm.group_name}</span>}
            </Link>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StandingsTable({ title, sport, teams, matches }: { title: string; sport: string; teams: Team[]; matches: MatchWithTeams[] }) {
  const rows = computeStandings(sport, teams, matches);
  const isBasket = sport === "basketball";
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b px-4 py-2 font-display text-lg font-bold uppercase">{title}</div>
      <table className="w-full text-sm tabular">
        <thead className="text-xs text-muted-foreground">
          <tr className="[&>th]:px-2 [&>th]:py-2">
            <th className="w-6 text-left">#</th>
            <th className="text-left">Équipe</th>
            <th>J</th>
            <th>G</th>
            {!isBasket && <th>N</th>}
            <th>P</th>
            <th>{isBasket ? "+/-" : "Diff"}</th>
            <th className="text-primary">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team.id} className={cn("border-t text-center [&>td]:px-2 [&>td]:py-2.5", i < 2 && "bg-primary/5")}>
              <td className="text-left text-muted-foreground">{i + 1}</td>
              <td className="text-left">
                <Link to="/equipe/$id" params={{ id: r.team.id }} className="flex items-center gap-2 font-semibold">
                  <TeamBadge team={r.team} size={24} />
                  <span className="truncate">{r.team.name}</span>
                </Link>
              </td>
              <td>{r.played}</td>
              <td>{r.won}</td>
              {!isBasket && <td>{r.drawn}</td>}
              <td>{r.lost}</td>
              <td>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
              <td className="font-bold text-primary">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Bracket({ matches }: { matches: MatchWithTeams[] }) {
  if (!matches.length) return <Empty>Le tableau des phases finales n'est pas encore défini.</Empty>;
  const phases = [...new Set(matches.map((m) => m.phase))].sort((a, b) => {
    const ia = KNOCKOUT_ORDER.indexOf(a);
    const ib = KNOCKOUT_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="flex gap-4">
        {phases.map((p) => (
          <div key={p} className="flex w-60 shrink-0 flex-col justify-around gap-3">
            <h3 className="text-center font-display text-sm font-bold uppercase tracking-widest text-accent">{p}</h3>
            {matches
              .filter((m) => m.phase === p)
              .map((m) => {
                const done = m.status === "termine";
                return (
                  <Link key={m.id} to="/match/$id" params={{ id: m.id }} className="overflow-hidden rounded-xl border bg-card text-sm">
                    {[
                      { team: m.team_a, score: m.score_a, win: done && m.score_a > m.score_b },
                      { team: m.team_b, score: m.score_b, win: done && m.score_b > m.score_a },
                    ].map((row, i) => (
                      <div key={i} className={cn("flex items-center gap-2 px-3 py-2", i === 1 && "border-t", row.win && "bg-primary/10")}>
                        <TeamBadge team={row.team} size={20} />
                        <span className={cn("flex-1 truncate", row.win && "font-bold")}>{row.team.name}</span>
                        <span className="font-display text-lg font-bold tabular">{m.status === "a_venir" ? "–" : row.score}</span>
                      </div>
                    ))}
                    {m.status === "en_cours" && <div className="bg-live/20 px-3 py-0.5 text-[10px] font-bold uppercase text-live">En direct</div>}
                  </Link>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
