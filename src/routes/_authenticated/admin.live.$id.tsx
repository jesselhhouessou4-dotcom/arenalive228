import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lineupsQuery, matchEventsQuery, matchPlayersQuery, matchQuery, useRealtime } from "@/lib/queries";
import { AdminGate, BackLink, errMsg } from "@/components/admin-ui";
import { ErrorBox, LoadingList, elapsedMinute } from "@/components/common";
import { EventFeed, Scoreboard } from "@/components/match-ui";
import { EVENT_META, excludedPlayerIds, onFieldPlayerIds, type EventType, type MatchEvent, type Player } from "@/lib/sports";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/live/$id")({
  head: () => ({ meta: [{ title: "Saisie en direct" }, { name: "description", content: "Console de saisie des événements du match." }] }),
  component: () => (
    <AdminGate allowScorer>
      <Live />
    </AdminGate>
  ),
});

const FOOT: EventType[] = ["but", "carton_jaune", "carton_rouge", "passe_decisive", "hors_jeu", "remplacement"];
const BASKET: EventType[] = ["panier_2", "panier_3", "panier_1", "faute_personnelle", "faute_technique", "rebond", "passe", "steal", "block", "remplacement"];

function Live() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const match = useQuery(matchQuery(id));
  const events = useQuery(matchEventsQuery(id));
  const lineups = useQuery(lineupsQuery(id));
  const players = useQuery({ ...matchPlayersQuery(match.data?.team_a_id ?? "", match.data?.team_b_id ?? ""), enabled: !!match.data });
  useRealtime("match_events", `match_id=eq.${id}`, [["match-events", id], ["match", id]]);
  const [team, setTeam] = useState<"a" | "b">("a");
  const [pending, setPending] = useState<{ type: EventType; out?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const pmap = useMemo(() => new Map<string, Player>((players.data ?? []).map((p) => [p.id, p])), [players.data]);

  if (match.isLoading) return <LoadingList />;
  if (match.error) return <ErrorBox error={match.error} />;
  const m = match.data!;
  const sport = m.tournament.sport_id;
  const ev = events.data ?? [];
  const teamId = team === "a" ? m.team_a_id : m.team_b_id;
  const lu = lineups.data ?? [];
  const onField = onFieldPlayerIds(lu, ev, teamId);
  const excluded = excludedPlayerIds(ev);
  const teamPlayers = (players.data ?? []).filter((p) => p.team_id === teamId && !excluded.has(p.id));
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["match-events", id] });
    qc.invalidateQueries({ queryKey: ["match", id] });
  };

  async function add(type: EventType, extra: Partial<MatchEvent> = {}) {
    setBusy(true);
    const { error } = await supabase.from("match_events").insert({
      match_id: id,
      type,
      team_id: ["debut_match", "changement_periode", "fin_match"].includes(type) ? null : teamId,
      minute: elapsedMinute(m.started_at),
      ...extra,
    });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success(EVENT_META[type].label);
    refresh();
  }
  async function del(e: MatchEvent) {
    if (!confirm(`Supprimer « ${EVENT_META[e.type].label} » ?`)) return;
    const { error } = await supabase.from("match_events").delete().eq("id", e.id);
    if (error) return toast.error(errMsg(error));
    refresh();
  }
  const last = [...ev].reverse().find((e) => !e.auto_generated);

  function pick(pid: string) {
    if (!pending) return;
    if (pending.type === "remplacement" && !pending.out) return setPending({ ...pending, out: pid });
    const extra = pending.type === "remplacement" ? { player_id: pending.out!, related_player_id: pid } : { player_id: pid };
    const t = pending.type;
    setPending(null);
    add(t, extra);
  }

  const pickList =
    pending?.type === "remplacement"
      ? pending.out
        ? teamPlayers.filter((p) => !onField.has(p.id))
        : teamPlayers.filter((p) => onField.has(p.id) || !lu.length)
      : [...teamPlayers].sort((a, b) => Number(onField.has(b.id)) - Number(onField.has(a.id)));

  return (
    <div className="space-y-4 pb-6">
      <BackLink to="/admin">Espace admin</BackLink>
      <Scoreboard match={m} />
      <div className="grid grid-cols-3 gap-2">
        <Button className="h-12" disabled={busy || m.status !== "a_venir"} onClick={() => add("debut_match")}>Début</Button>
        <Button variant="secondary" className="h-12" disabled={busy || m.status !== "en_cours"} onClick={() => add("changement_periode")}>
          {sport === "basketball" ? "Quart suivant" : "Mi-temps"}
        </Button>
        <Button variant="destructive" className="h-12" disabled={busy || m.status !== "en_cours"} onClick={() => confirm("Terminer le match ?") && add("fin_match")}>Fin</Button>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
        {(["a", "b"] as const).map((k) => {
          const t = k === "a" ? m.team_a : m.team_b;
          return (
            <button key={k} onClick={() => setTeam(k)} className={cn("rounded-xl py-3 font-display text-lg font-bold", team === k && "bg-card shadow")} style={team === k ? { boxShadow: `inset 0 -3px 0 ${t.color}` } : undefined}>
              {t.name}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(sport === "basketball" ? BASKET : FOOT).map((t) => (
          <button
            key={t}
            disabled={busy || m.status !== "en_cours"}
            onClick={() => setPending({ type: t })}
            className={cn(
              "flex h-20 flex-col items-center justify-center rounded-2xl border bg-card text-lg font-bold active:scale-95 disabled:opacity-40",
              (t === "but" || t.startsWith("panier")) && "bg-primary text-primary-foreground",
              t === "carton_jaune" && "bg-yellow-card text-background",
              t === "carton_rouge" && "bg-red-card",
            )}
          >
            <span className="text-2xl">{EVENT_META[t].icon}</span>
            {EVENT_META[t].short}
          </button>
        ))}
      </div>
      <Button variant="outline" className="h-14 w-full text-base" disabled={!last || busy} onClick={() => last && del(last)}>
        <Undo2 className="h-5 w-5" /> Annuler la dernière action {last ? `(${EVENT_META[last.type].short})` : ""}
      </Button>
      <EventFeed match={m} events={ev} players={pmap} onDelete={del} />

      <Sheet open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {pending && EVENT_META[pending.type].label}
              {pending?.type === "remplacement" && (pending.out ? " — joueur entrant" : " — joueur sortant")}
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 p-4">
            {pickList.map((p) => (
              <button key={p.id} onClick={() => pick(p.id)} className={cn("rounded-2xl border bg-card p-3 text-center active:scale-95", onField.has(p.id) && "border-primary/50")}>
                <span className="block font-display text-3xl font-extrabold">{p.jersey_number ?? "-"}</span>
                <span className="block truncate text-xs">{p.name}</span>
              </button>
            ))}
            {pending && pending.type !== "remplacement" && (
              <button onClick={() => { const t = pending.type; setPending(null); add(t); }} className="rounded-2xl border border-dashed p-3 text-xs text-muted-foreground">
                Sans joueur
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
