import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { matchesQuery, playersQuery, teamQuery } from "@/lib/queries";
import { Empty, ErrorBox, LoadingList, MatchCard, PlayerAvatar, Section, TeamBadge } from "@/components/common";

export const Route = createFileRoute("/equipe/$id")({
  head: () => ({
    meta: [
      { title: "Équipe — effectif et matchs" },
      { name: "description", content: "Informations de l'équipe, effectif complet et calendrier." },
      { property: "og:title", content: "Équipe — effectif et matchs" },
      { property: "og:description", content: "Effectif complet et calendrier de l'équipe." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { id } = Route.useParams();
  const team = useQuery(teamQuery(id));
  const players = useQuery(playersQuery(id));
  const matches = useQuery(matchesQuery({ teamId: id }));

  if (team.isLoading) return <LoadingList rows={2} />;
  if (team.error) return <ErrorBox error={team.error} onRetry={() => team.refetch()} />;
  const t = team.data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-3xl border bg-card p-5" style={{ boxShadow: `inset 6px 0 0 ${t.color}` }}>
        <TeamBadge team={t} size={72} />
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase leading-none">{t.name}</h1>
          <Link to="/tournoi/$id" params={{ id: t.tournament_id }} className="text-sm text-primary">
            {t.tournament?.name}
          </Link>
          {t.group_name && <p className="text-xs text-muted-foreground">Poule {t.group_name}</p>}
        </div>
      </div>

      <Section title={`Effectif (${players.data?.length ?? 0})`}>
        {players.isLoading ? (
          <LoadingList rows={2} />
        ) : !players.data?.length ? (
          <Empty>Aucun joueur enregistré.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {players.data.map((p) => (
              <Link key={p.id} to="/joueur/$id" params={{ id: p.id }} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                <PlayerAvatar player={p} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-display font-bold text-foreground">#{p.jersey_number ?? "-"}</span> · {p.position ?? "—"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="Matchs">
        {matches.isLoading ? <LoadingList /> : matches.data?.length ? matches.data.map((m) => <MatchCard key={m.id} match={m} />) : <Empty>Aucun match.</Empty>}
      </Section>
    </div>
  );
}
