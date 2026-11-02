import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { matchesQuery, teamsQuery, tournamentQuery } from "@/lib/queries";
import { AdminGate, BackLink, errMsg } from "@/components/admin-ui";
import { TournamentDialog } from "@/components/TournamentDialog";
import { Empty, ErrorBox, LoadingList, MatchCard, Section, TeamBadge } from "@/components/common";
import { FORMAT_LABEL, KNOCKOUT_ORDER, SPORT_CONFIG, STATUS_LABEL, type SportId, type Team } from "@/lib/sports";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/tournois/$id")({
  head: () => ({ meta: [{ title: "Admin — tournoi" }, { name: "description", content: "Gestion des équipes et des matchs du tournoi." }] }),
  component: () => (
    <AdminGate>
      <AdminTournament />
    </AdminGate>
  ),
});

function AdminTournament() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const t = useQuery(tournamentQuery(id));
  const teams = useQuery(teamsQuery(id));
  const matches = useQuery(matchesQuery({ tournamentId: id }));

  if (t.isLoading) return <LoadingList />;
  if (t.error) return <ErrorBox error={t.error} />;
  const tour = t.data!;

  async function remove() {
    if (!confirm(`Supprimer « ${tour.name} » et toutes ses équipes, joueurs et matchs ?`)) return;
    const { error } = await supabase.from("tournaments").delete().eq("id", id);
    if (error) return toast.error(errMsg(error));
    toast.success("Tournoi supprimé");
    qc.invalidateQueries({ queryKey: ["tournaments"] });
    navigate({ to: "/admin" });
  }

  return (
    <div className="space-y-7">
      <BackLink to="/admin">Espace admin</BackLink>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            {SPORT_CONFIG[tour.sport_id as SportId]?.label} · {FORMAT_LABEL[tour.format]} · {STATUS_LABEL[tour.status]}
          </p>
          <h1 className="font-display text-3xl font-extrabold uppercase leading-tight">{tour.name}</h1>
        </div>
        <div className="flex gap-1">
          <TournamentDialog
            initial={{ id: tour.id, name: tour.name, sport_id: tour.sport_id, format: tour.format, start_date: tour.start_date ?? "", end_date: tour.end_date ?? "", status: tour.status }}
            onDone={() => qc.invalidateQueries({ queryKey: ["tournament", id] })}
            trigger={
              <Button variant="secondary" size="icon" aria-label="Modifier">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={remove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <Section title={`Équipes (${teams.data?.length ?? 0})`} action={<TeamDialog tournamentId={id} onDone={() => qc.invalidateQueries({ queryKey: ["teams", id] })} />}>
        {teams.isLoading ? (
          <LoadingList rows={2} />
        ) : !teams.data?.length ? (
          <Empty>Ajoutez des équipes.</Empty>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {teams.data.map((tm) => (
              <Link key={tm.id} to="/admin/equipes/$id" params={{ id: tm.id }} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                <TeamBadge team={tm} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{tm.name}</p>
                  {tm.group_name && <p className="text-xs text-muted-foreground">Poule {tm.group_name}</p>}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Matchs"
        action={<MatchDialog tournamentId={id} teams={teams.data ?? []} format={tour.format} onDone={() => qc.invalidateQueries({ queryKey: ["matches"] })} />}
      >
        {matches.isLoading ? <LoadingList /> : matches.data?.length ? matches.data.map((m) => <MatchCard key={m.id} match={m} admin />) : <Empty>Aucun match.</Empty>}
      </Section>
    </div>
  );
}

export function TeamDialog({ tournamentId, team, onDone, trigger }: { tournamentId: string; team?: Team; onDone: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: team?.name ?? "", short_name: team?.short_name ?? "", color: team?.color ?? "#22c55e", group_name: team?.group_name ?? "" });
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = { name: f.name, short_name: f.short_name || null, color: f.color, group_name: f.group_name || null, tournament_id: tournamentId };
    const res = team ? await supabase.from("teams").update(payload).eq("id", team.id) : await supabase.from("teams").insert(payload);
    setBusy(false);
    if (res.error) return toast.error(errMsg(res.error));
    toast.success("Équipe enregistrée");
    setOpen(false);
    onDone();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" /> Équipe
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? "Modifier l'équipe" : "Nouvelle équipe"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Abrév.</Label>
              <Input maxLength={4} value={f.short_name} onChange={(e) => setF({ ...f, short_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Poule</Label>
              <Input maxLength={3} placeholder="A" value={f.group_name} onChange={(e) => setF({ ...f, group_name: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <Input type="color" className="h-9 p-1" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            Enregistrer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MatchDialog({ tournamentId, teams, format, onDone }: { tournamentId: string; teams: Team[]; format: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ team_a_id: "", team_b_id: "", scheduled_at: "", phase: format === "poules" ? "Poule" : "Demi-finale", venue: "" });
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.team_a_id || !f.team_b_id || f.team_a_id === f.team_b_id) return toast.error("Choisissez deux équipes différentes.");
    setBusy(true);
    const a = teams.find((t) => t.id === f.team_a_id);
    const { data, error } = await supabase
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        team_a_id: f.team_a_id,
        team_b_id: f.team_b_id,
        scheduled_at: f.scheduled_at ? new Date(f.scheduled_at).toISOString() : null,
        phase: f.phase,
        group_name: f.phase === "Poule" ? a?.group_name ?? null : null,
        venue: f.venue || null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success("Match créé — pensez à la composition.");
    setOpen(false);
    onDone();
    void data;
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={teams.length < 2}>
          <Plus className="h-4 w-4" /> Match
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau match</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          {(["team_a_id", "team_b_id"] as const).map((k, i) => (
            <div key={k} className="space-y-1.5">
              <Label>Équipe {i === 0 ? "A (domicile)" : "B"}</Label>
              <Select value={f[k]} onValueChange={(v) => setF({ ...f, [k]: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phase</Label>
              <Select value={f.phase} onValueChange={(v) => setF({ ...f, phase: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Poule", ...KNOCKOUT_ORDER].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lieu</Label>
              <Input value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Date et heure</Label>
            <Input type="datetime-local" value={f.scheduled_at} onChange={(e) => setF({ ...f, scheduled_at: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            Créer le match
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
