import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime, type MatchWithTeams } from "@/lib/queries";
import { PAUSE_REASONS, currentPauseSeconds, fmtSeconds, playedSeconds, type ClockState, type PauseReason } from "@/lib/match-clock";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function useTick() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** Chrono calculé à partir des horodatages du match (exact après rafraîchissement). */
export function MatchClock({ match, className }: { match: ClockState; className?: string }) {
  const now = useTick();
  return <span className={cn("tabular", className)}>{now === null ? "--:--" : fmtSeconds(playedSeconds(match, now))}</span>;
}

export function PauseBadge({ match }: { match: ClockState & { pause_reason?: string | null } }) {
  const now = useTick();
  if (!match.is_paused) return null;
  const label = PAUSE_REASONS[match.pause_reason as PauseReason] ?? "Pause";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold uppercase text-accent-foreground">
      En pause · {label}
      {match.pause_reason === "temps_mort" && now !== null && <span className="tabular">{fmtSeconds(currentPauseSeconds(match, now))}</span>}
    </span>
  );
}

export function clockStateLabel(m: MatchWithTeams) {
  if (m.status === "termine") return "Terminé";
  if (m.status === "a_venir") return "À venir";
  return m.is_paused ? "En pause" : "En cours";
}

/** Gros boutons Pause / Reprendre (admin ou marqueur du match ; contrôlé côté serveur). */
export function PauseControls({ match, sport }: { match: MatchWithTeams; sport: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["match", match.id] });
    qc.invalidateQueries({ queryKey: ["match-pauses", match.id] });
  };
  async function pause(reason: PauseReason) {
    setBusy(true);
    const { error } = await supabase.rpc("pause_match", { _match_id: match.id, _reason: reason });
    setBusy(false);
    setOpen(false);
    if (error) return toast.error(error.message);
    toast.success(`Pause : ${PAUSE_REASONS[reason]}`);
    refresh();
  }
  async function resume() {
    setBusy(true);
    const { error } = await supabase.rpc("resume_match", { _match_id: match.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Reprise du jeu");
    refresh();
  }
  const reasons = (Object.keys(PAUSE_REASONS) as PauseReason[]).filter((r) => !(sport === "basketball" && r === "mi_temps"));
  if (match.status !== "en_cours") return null;
  return (
    <div className="rounded-2xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className={cn("text-xs font-bold uppercase", match.is_paused ? "text-accent" : "text-live")}>{clockStateLabel(match)}</span>
        <MatchClock match={match} className="font-display text-3xl font-extrabold" />
      </div>
      {match.is_paused ? (
        <Button className="h-16 w-full text-lg" disabled={busy} onClick={resume}><Play className="mr-2 h-6 w-6" /> Reprendre</Button>
      ) : (
        <Button variant="secondary" className="h-16 w-full text-lg" disabled={busy} onClick={() => setOpen(true)}><Pause className="mr-2 h-6 w-6" /> Pause</Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motif de la pause</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {reasons.map((r) => (
              <Button key={r} variant="outline" className="h-16 text-base" disabled={busy} onClick={() => pause(r)}>{PAUSE_REASONS[r]}</Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PauseHistory({ matchId }: { matchId: string }) {
  const q = useQuery({
    queryKey: ["match-pauses", matchId],
    queryFn: async () => {
      const { data, error } = await supabase.from("match_pauses").select("*").eq("match_id", matchId).order("started_at");
      if (error) throw error;
      return data;
    },
  });
  useRealtime("match_pauses", `match_id=eq.${matchId}`, [["match-pauses", matchId]]);
  const now = useTick();
  if (!q.data?.length) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pauses</h3>
      <ol className="space-y-1.5">
        {q.data.map((p) => {
          const dur = p.duration_seconds ?? (now ? Math.max(0, Math.floor((now - new Date(p.started_at).getTime()) / 1000)) : 0);
          return (
            <li key={p.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-sm">
              <span>
                <span className="tabular text-muted-foreground">{new Date(p.started_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>{" "}
                <b>{PAUSE_REASONS[p.reason as PauseReason] ?? p.reason}</b>
                {p.created_by_name && <span className="text-muted-foreground"> · {p.created_by_name}</span>}
              </span>
              <span className="tabular font-semibold">{p.resumed_at ? fmtSeconds(dur) : `${fmtSeconds(dur)} (en cours)`}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
