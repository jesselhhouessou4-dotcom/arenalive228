import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { matchesQuery, tournamentsQuery, useRealtime } from "@/lib/queries";
import { Empty, ErrorBox, LiveDot, LoadingList, MatchCard, Section, formatDate } from "@/components/common";
import { SPORT_CONFIG, STATUS_LABEL, type SportId } from "@/lib/sports";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Matchs en direct, foot & basket` },
      { name: "description", content: "Scores en direct, prochains matchs et derniers résultats des tournois de football et basketball." },
      { property: "og:title", content: `${BRAND.name} — Matchs en direct` },
      { property: "og:description", content: "Scores en direct, prochains matchs et derniers résultats." },
    ],
  }),
  component: Home,
});

function Home() {
  const matches = useQuery(matchesQuery());
  const tournaments = useQuery(tournamentsQuery());
  useRealtime("matches", undefined, [["matches"]]);

  const all = matches.data ?? [];
  const live = all.filter((m) => m.status === "en_cours");
  const upcoming = all.filter((m) => m.status === "a_venir").slice(0, 5);
  const results = all
    .filter((m) => m.status === "termine")
    .sort((a, b) => (b.ended_at ?? "").localeCompare(a.ended_at ?? ""))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="pt-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">{BRAND.tagline}</p>
        <h1 className="font-display text-4xl font-extrabold uppercase italic leading-none">Le terrain, en direct.</h1>
      </div>

      {matches.isLoading ? (
        <LoadingList />
      ) : matches.error ? (
        <ErrorBox error={matches.error} onRetry={() => matches.refetch()} />
      ) : (
        <>
          <Section
            title={
              <span className="flex items-center gap-2">
                <LiveDot /> En direct
              </span>
            }
          >
            {live.length ? live.map((m) => <MatchCard key={m.id} match={m} />) : <Empty>Aucun match en cours pour le moment.</Empty>}
          </Section>
          <Section title="Prochains matchs">
            {upcoming.length ? upcoming.map((m) => <MatchCard key={m.id} match={m} />) : <Empty>Aucun match programmé.</Empty>}
          </Section>
          <Section title="Derniers résultats">
            {results.length ? results.map((m) => <MatchCard key={m.id} match={m} />) : <Empty>Pas encore de résultat.</Empty>}
          </Section>
        </>
      )}

      <Section
        title="Tournois"
        action={
          <Link to="/tournois" className="text-sm font-semibold text-primary">
            Tout voir
          </Link>
        }
      >
        {tournaments.isLoading ? (
          <LoadingList rows={2} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(tournaments.data ?? []).slice(0, 4).map((t) => (
              <Link
                key={t.id}
                to="/tournoi/$id"
                params={{ id: t.id }}
                className="flex min-w-0 items-center gap-3 rounded-2xl border bg-card p-4"
              >
                <span className="shrink-0 text-3xl">{SPORT_CONFIG[t.sport_id as SportId]?.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {STATUS_LABEL[t.status]} · {formatDate(t.start_date, false)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
