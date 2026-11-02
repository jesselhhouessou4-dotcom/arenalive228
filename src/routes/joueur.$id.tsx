import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { playerEventsQuery, playerQuery } from "@/lib/queries";
import { ErrorBox, LoadingList, PlayerAvatar, TeamBadge } from "@/components/common";
import { playerStats } from "@/lib/sports";

export const Route = createFileRoute("/joueur/$id")({
  head: () => ({
    meta: [
      { title: "Fiche joueur — statistiques" },
      { name: "description", content: "Photo, poste, numéro et statistiques du joueur." },
      { property: "og:title", content: "Fiche joueur" },
      { property: "og:description", content: "Photo et statistiques du joueur." },
    ],
  }),
  component: PlayerPage,
});

function PlayerPage() {
  const { id } = Route.useParams();
  const player = useQuery(playerQuery(id));
  const events = useQuery(playerEventsQuery(id));

  if (player.isLoading) return <LoadingList rows={2} />;
  if (player.error) return <ErrorBox error={player.error} onRetry={() => player.refetch()} />;
  const p = player.data!;
  const sport = p.team?.tournament?.sport_id ?? "football";
  const stats = playerStats(sport, events.data ?? [], p.id);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border bg-card p-6 text-center">
        <div className="absolute inset-x-0 top-0 h-24 opacity-40" style={{ background: `linear-gradient(180deg, ${p.team?.color}, transparent)` }} />
        <div className="relative flex flex-col items-center gap-3">
          <PlayerAvatar player={p} size={128} className="ring-4 ring-background" />
          <div>
            <p className="font-display text-6xl font-extrabold leading-none text-primary">{p.jersey_number ?? "–"}</p>
            <h1 className="font-display text-3xl font-extrabold uppercase">{p.name}</h1>
            <p className="text-sm text-muted-foreground">{p.position ?? "Poste non renseigné"}</p>
          </div>
          {p.team && (
            <Link to="/equipe/$id" params={{ id: p.team.id }} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold">
              <TeamBadge team={p.team} size={22} /> {p.team.name}
            </Link>
          )}
        </div>
      </div>
      {events.error ? (
        <ErrorBox error={events.error} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-4">
              <p className="font-display text-4xl font-extrabold tabular">{events.isLoading ? "…" : s.value}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
