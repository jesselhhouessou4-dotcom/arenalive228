import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lineupsQuery, matchPlayersQuery, matchQuery } from "@/lib/queries";
import { AdminGate, BackLink, errMsg } from "@/components/admin-ui";
import { ErrorBox, LoadingList, Section, TeamBadge } from "@/components/common";
import { Scoreboard } from "@/components/match-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/matchs/$id")({
  head: () => ({ meta: [{ title: "Admin — match" }, { name: "description", content: "Composition et marqueur du match." }] }),
  component: () => (
    <AdminGate>
      <AdminMatch />
    </AdminGate>
  ),
});

type Row = { status: "titulaire" | "remplacant" | "reserve" | "absent"; position: string; captain: boolean };
const STATUSES = [["titulaire", "Tit."], ["remplacant", "Rempl."], ["reserve", "Rés."], ["absent", "—"]] as const;

function AdminMatch() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const match = useQuery(matchQuery(id));
  const lineups = useQuery(lineupsQuery(id));
  const players = useQuery({ ...matchPlayersQuery(match.data?.team_a_id ?? "", match.data?.team_b_id ?? ""), enabled: !!match.data });
  const scorers = useQuery({
    queryKey: ["scorers"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "marqueur");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("id, email, display_name").in("id", ids);
      return data ?? [];
    },
  });
  const [rows, setRows] = useState<Record<string, Row>>({});

  useEffect(() => {
    if (!players.data || !lineups.data) return;
    const r: Record<string, Row> = {};
    for (const p of players.data) {
      const l = lineups.data.find((x) => x.player_id === p.id);
      r[p.id] = { status: l?.status ?? "absent", position: l?.position ?? p.position ?? "", captain: l?.is_captain ?? false };
    }
    setRows(r);
  }, [players.data, lineups.data]);

  if (match.isLoading) return <LoadingList />;
  if (match.error) return <ErrorBox error={match.error} />;
  const m = match.data!;

  async function save() {
    const list = (players.data ?? []).filter((p) => rows[p.id]?.status !== "absent").map((p) => ({
      match_id: id, player_id: p.id, team_id: p.team_id, status: rows[p.id].status as "titulaire", position: rows[p.id].position || null, is_captain: rows[p.id].captain,
    }));
    const d = await supabase.from("lineups").delete().eq("match_id", id);
    if (d.error) return toast.error(errMsg(d.error));
    if (list.length) {
      const i = await supabase.from("lineups").insert(list);
      if (i.error) return toast.error(errMsg(i.error));
    }
    toast.success("Composition enregistrée");
    qc.invalidateQueries({ queryKey: ["lineups", id] });
  }
  async function setScorer(v: string) {
    const { error } = await supabase.from("matches").update({ scorer_id: v || null }).eq("id", id);
    if (error) return toast.error(errMsg(error));
    toast.success("Marqueur attribué");
    qc.invalidateQueries({ queryKey: ["match", id] });
  }
  async function delMatch() {
    if (!confirm("Supprimer ce match ?")) return;
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) return toast.error(errMsg(error));
    history.back();
  }

  return (
    <div className="space-y-6">
      <BackLink to="/admin/tournois/$id" params={{ id: m.tournament_id }}>Tournoi</BackLink>
      <Scoreboard match={m} />
      <div className="flex gap-2">
        <Button asChild className="flex-1"><Link to="/admin/live/$id" params={{ id }}><Radio className="h-4 w-4" /> Console live</Link></Button>
        <Button variant="ghost" onClick={delMatch} className="text-destructive">Supprimer</Button>
      </div>
      <Section title="Marqueur attribué">
        <select className="h-11 w-full rounded-md border bg-card px-3" value={m.scorer_id ?? ""} onChange={(e) => setScorer(e.target.value)}>
          <option value="">Aucun (admins uniquement)</option>
          {(scorers.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.display_name ?? s.email}</option>)}
        </select>
      </Section>
      {[m.team_a, m.team_b].map((team) => (
        <Section key={team.id} title={<span className="flex items-center gap-2"><TeamBadge team={team} size={26} /> {team.name}</span>}>
          {(players.data ?? []).filter((p) => p.team_id === team.id).map((p) => {
            const r = rows[p.id];
            if (!r) return null;
            const set = (patch: Partial<Row>) => setRows((s) => {
              const n = { ...s };
              if (patch.captain) for (const k of Object.keys(n)) if ((players.data ?? []).find((x) => x.id === k)?.team_id === team.id) n[k] = { ...n[k], captain: false };
              n[p.id] = { ...n[p.id], ...patch };
              return n;
            });
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-2">
                <span className="w-8 text-center font-display text-lg font-bold">{p.jersey_number}</span>
                <span className="min-w-24 flex-1 truncate text-sm font-semibold">{p.name}</span>
                <div className="flex rounded-lg bg-secondary p-0.5">
                  {STATUSES.map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set({ status: v })} className={`rounded-md px-2 py-1 text-xs font-semibold ${r.status === v ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>
                  ))}
                </div>
                <Input className="h-8 w-20" value={r.position} onChange={(e) => set({ position: e.target.value })} placeholder="Poste" />
                <button type="button" onClick={() => set({ captain: !r.captain })} className={`h-8 w-8 rounded-full font-display font-extrabold ${r.captain ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`} title="Capitaine">C</button>
              </div>
            );
          })}
        </Section>
      ))}
      <Button className="h-12 w-full" onClick={save}>Enregistrer la composition</Button>
    </div>
  );
}
