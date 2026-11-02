import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { lineupsQuery, matchEventsQuery, matchPlayersQuery, matchQuery, useRealtime } from "@/lib/queries";
import { ErrorBox, LoadingList } from "@/components/common";
import { EventFeed, LineupBoard, Scoreboard, TeamStatsCompare } from "@/components/match-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Player } from "@/lib/sports";

export const Route = createFileRoute("/match/$id")({
  head: () => ({
    meta: [
      { title: "Match en direct — score et événements" },
      { name: "description", content: "Score, chrono, fil des événements et compositions en temps réel." },
      { property: "og:title", content: "Match en direct" },
      { property: "og:description", content: "Score et fil des événements en temps réel." },
    ],
  }),
  component: MatchPage,
});

function MatchPage() {
  const { id } = Route.useParams();
  const match = useQuery(matchQuery(id));
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

  if (match.isLoading) return <LoadingList rows={2} />;
  if (match.error) return <ErrorBox error={match.error} onRetry={() => match.refetch()} />;
  const m = match.data!;
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
          {lineups.isLoading ? (
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
