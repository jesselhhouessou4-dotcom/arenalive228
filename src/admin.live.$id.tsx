import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lineupsQuery, matchEventsQuery, matchPlayersQuery, matchQuery, useRealtime } from "@/lib/queries";
import { AdminGate, BackLink, errMsg } from "@/components/admin-ui";
import { ErrorBox, LoadingList, elapsedMinute } from "@/components/common";
import { EventFeed, Scoreboard, TeamFoulsBadges } from "@/components/match-ui";
import { PauseControls, PauseHistory } from "@/components/MatchPause";
import {
  EVENT_META,
  FOUL_TYPES_FOR_PLAYER_LIMIT,
  PLAYER_REQUIRED_EVENTS,
  TEAM_ONLY_EVENTS,
  excludedPlayerIds,
  onFieldPlayerIds,
  playerFoulCount,
  type EventType,
  type MatchEvent,
  type Player,
} from "@/lib/sports";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/live/$id")({
  head: () => ({ meta: [
    { title: "Saisie en direct — ArenaLive" },
    { name: "description", content: "Console de saisie des événements du match sur ArenaLive." },
    { property: "og:title", content: "Saisie en direct — ArenaLive" },
    { property: "og:description", content: "Console de saisie des événements du match sur ArenaLive." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => (
    <AdminGate allowScorer>
      <Live />
    </AdminGate>
  ),
});

// Boutons principaux (toujours visibles) et secondaires (bloc « Plus ») de la console.
const FOOT: EventType[] = ["but", "carton_jaune", "carton_rouge", "faute", "passe_decisive", "hors_jeu", "corner", "coup_franc", "penalty_accorde", "remplacement"];
const FOOT_MORE: EventType[] = ["touche", "faute_main", "penalty_manque", "but_contre_son_camp"];
const BASKET: EventType[] = ["panier_2", "panier_3", "panier_1", "faute_personnelle", "rebond", "passe", "steal", "block", "perte_balle", "temps_mort", "remplacement"];
const BASKET_MORE: EventType[] = ["faute_technique", "faute_offensive", "faute_antisportive", "faute_disqualifiante", "faute_technique_coach"];

function Live() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const match = useQuery(matchQuery(id));
  const events = useQuery(matchEventsQuery(id));
  const lineups = useQuery(lineupsQuery(id));
  const players = useQuery({ ...matchPlayersQuery(match.data?.team_a_id ?? "", match.data?.team_b_id ?? ""), enabled: !!match.data });
  useRealtime("match_events", `match_id=eq.${id}`, [["match-events", id], ["match", id]]);
  useRealtime("matches", `id=eq.${id}`, [["match", id]]);
  const [team, setTeam] = useState<"a" | "b">("a");
  const [pending, setPending] = useState<{ type: EventType; out?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const pmap = useMemo(() => new Map<string, Player>((players.data ?? []).map((p) => [p.id, p])), [players.data]);

  if (match.isLoading) return <LoadingList />;
  if (match.error) return <ErrorBox error={match.error} />;
  const m = match.data;
  if (!m) return <ErrorBox error={new Error("Match introuvable.")} />;
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
    if (!m) return;
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
    // Basket : prévient quand un joueur atteint 4 fautes (la 5e l'exclut automatiquement).
    const pid = extra.player_id;
    if (pid && FOUL_TYPES_FOR_PLAYER_LIMIT.includes(type) && playerFoulCount(ev, pid) + 1 === 4) {
      toast.warning(`${pmap.get(pid)?.name ?? "Ce joueur"} a 4 fautes : la prochaine l'exclut.`);
    }
    // Un temps mort met aussi le chrono en pause (motif « Temps mort »), s'il ne l'est pas déjà.
    if (type === "temps_mort" && !m.is_paused) {
      const { error: pauseError } = await supabase.rpc("pause_match", { _match_id: id, _reason: "temps_mort" });
      if (pauseError) toast.error(`Temps mort noté, mais le chrono n'a pas été mis en pause : ${errMsg(pauseError)}`);
    }
    refresh();
  }
  async function del(e: MatchEvent) {
    if (!confirm(`Supprimer « ${EVENT_META[e.type].label} » ?`)) return;
    const { error } = await supabase.from("match_events").delete().eq("id", e.id);
    if (error) return toast.error(errMsg(error));
    refresh();
  }
  const last = [...ev].reverse().find((e) => !e.auto_generated);

  function press(t: EventType) {
    if (TEAM_ONLY_EVENTS.includes(t)) add(t);
    else setPending({ type: t });
  }

  function pick(pid: string) {
    if (!pending) return;
    if (pending.type === "remplacement" && !pending.out) return setPending({ ...pending, out: pid });
    const extra = pending.type === "remplacement" ? { player_id: pending.out ?? null, related_player_id: pid } : { player_id: pid };
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
      <PauseControls match={m} sport={sport} />
      {sport === "basketball" && <TeamFoulsBadges match={m} events={ev} />}
      <div className="grid grid-cols-3 gap-2">
        <Button className="h-12" disabled={busy || m.status !== "a_venir"} onClick={() => add("debut_match")}>Début</Button>
        <Button variant="secondary" className="h-12" disabled={busy || m.status !== "en_cours"} onClick={() => confirm(sport === "basketball" ? "Terminer ce quart-temps ?" : "Terminer cette période ?") && add("changement_periode")}>
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
          <EventButton key={t} type={t} disabled={busy || m.status !== "en_cours"} onPress={() => press(t)} />
        ))}
      </div>
      <Button variant="ghost" className="w-full" onClick={() => setShowMore((v) => !v)}>
        {showMore ? "Moins d'actions" : "Plus d'actions"}
      </Button>
      {showMore && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(sport === "basketball" ? BASKET_MORE : FOOT_MORE).map((t) => (
            <EventButton key={t} type={t} disabled={busy || m.status !== "en_cours"} onPress={() => press(t)} />
          ))}
        </div>
      )}
      <Button variant="outline" className="h-14 w-full text-base" disabled={!last || busy} onClick={() => last && del(last)}>
        <Undo2 className="h-5 w-5" /> Annuler la dernière action {last ? `(${EVENT_META[last.type].short})` : ""}
      </Button>
      <EventFeed match={m} events={ev} players={pmap} onDelete={del} />
      <PauseHistory matchId={m.id} />

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
            {pending && pending.type !== "remplacement" && !PLAYER_REQUIRED_EVENTS.includes(pending.type) && (
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

function EventButton({ type, disabled, onPress }: { type: EventType; disabled: boolean; onPress: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onPress}
      className={cn(
        "flex h-20 flex-col items-center justify-center rounded-2xl border bg-card text-lg font-bold active:scale-95 disabled:opacity-40",
        (type === "but" || type.startsWith("panier")) && "bg-primary text-primary-foreground",
        type === "carton_jaune" && "bg-yellow-card text-background",
        (type === "carton_rouge" || type === "faute_disqualifiante") && "bg-red-card",
      )}
    >
      <span className="text-2xl">{EVENT_META[type].icon}</span>
      {EVENT_META[type].short}
    </button>
  );
}
