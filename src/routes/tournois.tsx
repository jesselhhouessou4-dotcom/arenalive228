import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { tournamentsQuery } from "@/lib/queries";
import { Empty, ErrorBox, LoadingList, formatDate } from "@/components/common";
import { FORMAT_LABEL, SPORT_CONFIG, STATUS_LABEL, type SportId } from "@/lib/sports";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/tournois")({
  head: () => ({
    meta: [
      { title: "Tournois — football & basketball" },
      { name: "description", content: "Tous les tournois : calendrier, classements et phases finales." },
      { property: "og:title", content: "Tournois — football & basketball" },
      { property: "og:description", content: "Calendrier, classements et phases finales." },
    ],
  }),
  component: Tournaments,
});

function Tournaments() {
  const q = useQuery(tournamentsQuery());
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold uppercase">Tournois</h1>
      {q.isLoading ? (
        <LoadingList />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <Empty>Aucun tournoi pour l'instant.</Empty>
      ) : (
        q.data.map((t) => (
          <Link key={t.id} to="/tournoi/$id" params={{ id: t.id }} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
            <span className="text-4xl">{SPORT_CONFIG[t.sport_id as SportId]?.emoji}</span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-display text-xl font-bold leading-tight">{t.name}</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={t.status === "en_cours" ? "default" : "secondary"}>{STATUS_LABEL[t.status]}</Badge>
                <Badge variant="outline">{FORMAT_LABEL[t.format]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(t.start_date, false)} → {formatDate(t.end_date, false)}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))
      )}
    </div>
  );
}
