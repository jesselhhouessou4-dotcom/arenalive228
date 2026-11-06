import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { lineupsQuery, matchEventsQuery, matchPlayersQuery, matchQuery, useRealtime } from "@/lib/queries";
import { ErrorBox, LoadingList } from "@/components/common";
import { EventFeed, LineupBoard, Scoreboard, TeamStatsCompare } from "@/components/match-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Player } from "@/lib/sports";

export const Route = createFileRoute("/match/$id")({
  loader: async ({ context, params }) => {
    const match = await context.queryClient.ensureQueryData(matchQuery(params.id));
    if (!match) throw notFound();
    return { name: `${match.team_a.name} – ${match.team_b.name}`, tournament: match.tournament.name };
  },
  pendingComponent: () => <LoadingList rows={2} />,
  errorComponent: MatchLoadError,
  notFoundComponent: () => <p className="py-6 text-center text-muted-foreground">Match introuvable.</p>,
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Match en direct"} — ArenaLive` },
      { name: "description", content: `Score et événements du match · ${loaderData?.tournament ?? "ArenaLive"}.` },
      { property: "og:title", content: `${loaderData?.name ?? "Match en direct"} — ArenaLive` },
      { property: "og:description", content: `Score et événements du match · ${loaderData?.tournament ?? "ArenaLive"}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatchPage,
});

function MatchLoadError({ error }: { error: unknown }) {
  const router = useRouter();
  const qc = useQueryClient();
  const message = error instanceof Error && error.message !== "Failed to fetch"
    ? error.message
    : "La connexion a été interrompue. Veuillez réessayer.";
  return <ErrorBox error={new Error(message)} onRetry={() => {
    qc.resetQueries({ queryKey: ["match"] });
    void router.invalidate();
  }} />;
}

function MatchPage() {
  const { id } = Route.useParams();
  const match = useSuspenseQuery(matchQuery(id));
  const events = useQuery(matchEventsQuery(id));
  const lineups = useQuery(lineupsQuery(id));
  const players = useQuery({
    ...matchPlayersQuery(match.data?.team_a_id ?? "", match.data?.team_b_id ?? ""),
    enabled: !!match.data,
  });
  useRealtime("match_events", `match_id=eq.${id}`, [["match-events", id], ["match", id]]);
  useRealtime("matches", `id=eq.${id}`, [["match", id]]);
  useRealtime("lineups", `match_id=eq.${id}`, [["lineups", id]]);

  const playerMap = useMemo(() => new Map<string, Player>((players.data ?? []).map((p) => [p.id, p])), [players.data]);

  const m = match.data;
  if (!m) return <p className="py-6 text-center text-muted-foreground">Match introuvable.</p>;
  const ev = events.data ?? [];
  const lu = (lineups.data ?? []) as Parameters<typeof LineupBoard>[0]["lineups"];

  return (
    <div className="space-y-5">
      <Scoreboard match={m} />
      <Tabs defaultValue={m.status === "a_venir" ? "compos" : "direct"}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="direct">Direct</TabsTrigger>
          <TabsTrigger value="compos">Compositions</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>
        <TabsContent value="direct" className="mt-4">
          {events.error ? <ErrorBox error={events.error} /> : events.isLoading ? <LoadingList /> : <EventFeed match={m} events={ev} players={playerMap} />}
        </TabsContent>
        <TabsContent value="compos" className="mt-4 space-y-8">
          {lineups.error ? <ErrorBox error={lineups.error} onRetry={() => lineups.refetch()} /> : lineups.isLoading ? (
            <LoadingList rows={2} />
          ) : (
            <>
              <LineupBoard team={m.team_a} lineups={lu} events={ev} sport={m.tournament.sport_id} />
              <LineupBoard team={m.team_b} lineups={lu} events={ev} sport={m.tournament.sport_id} />
            </>
          )}
        </TabsContent>
        <TabsContent value="stats" className="mt-4">
          <TeamStatsCompare match={m} events={ev} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
