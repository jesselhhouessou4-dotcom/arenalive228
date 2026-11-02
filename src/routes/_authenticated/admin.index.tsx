import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, LogOut, Plus, Radio, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { matchesQuery, tournamentsQuery } from "@/lib/queries";
import { AdminGate, errMsg } from "@/components/admin-ui";
import { Empty, ErrorBox, LoadingList, Section, TeamBadge, formatDate } from "@/components/common";
import { FORMAT_LABEL, SPORT_CONFIG, STATUS_LABEL, type SportId } from "@/lib/sports";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Espace admin — gestion des tournois" },
      { name: "description", content: "Gestion des tournois, équipes, joueurs et matchs." },
      { property: "og:title", content: "Espace admin" },
      { property: "og:description", content: "Gestion des tournois et des matchs." },
    ],
  }),
  component: () => (
    <AdminGate allowScorer>
      <AdminHome />
    </AdminGate>
  ),
});

function AdminHome() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const tournaments = useQuery({ ...tournamentsQuery(), enabled: isAdmin });
  const matches = useQuery(matchesQuery());
  const mine = (matches.data ?? []).filter((m) => isAdmin || m.scorer_id === user?.id);
  const active = mine.filter((m) => m.status !== "termine");

  async function signOut() {
    await qc.cancelQueries();
    await supabase.auth.signOut();
    window.location.replace("/auth");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">{isAdmin ? "Administrateur" : "Marqueur"}</p>
          <h1 className="font-display text-3xl font-extrabold uppercase">Espace admin</h1>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Déconnexion
        </Button>
      </div>

      <Section title={isAdmin ? "Matchs à gérer" : "Mes matchs attribués"}>
        {matches.isLoading ? (
          <LoadingList />
        ) : matches.error ? (
          <ErrorBox error={matches.error} />
        ) : !active.length ? (
          <Empty>{isAdmin ? "Aucun match à venir." : "Aucun match ne vous est attribué pour l'instant."}</Empty>
        ) : (
          active.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
              <div className="flex -space-x-2">
                <TeamBadge team={m.team_a} size={32} />
                <TeamBadge team={m.team_b} size={32} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {m.team_a.name} – {m.team_b.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.status === "en_cours" ? `En cours · ${m.score_a}-${m.score_b}` : formatDate(m.scheduled_at)}
                </p>
              </div>
              {isAdmin && (
                <Button asChild variant="secondary" size="sm">
                  <Link to="/admin/matchs/$id" params={{ id: m.id }}>
                    Gérer
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" className={m.status === "en_cours" ? "bg-live text-foreground hover:bg-live/90" : ""}>
                <Link to="/admin/live/$id" params={{ id: m.id }}>
                  <Radio className="h-4 w-4" /> Live
                </Link>
              </Button>
            </div>
          ))
        )}
      </Section>

      {isAdmin && (
        <>
          <Section title="Tournois" action={<TournamentDialog onDone={() => qc.invalidateQueries({ queryKey: ["tournaments"] })} />}>
            {tournaments.isLoading ? (
              <LoadingList rows={2} />
            ) : !tournaments.data?.length ? (
              <Empty>Créez votre premier tournoi.</Empty>
            ) : (
              tournaments.data.map((t) => (
                <Link key={t.id} to="/admin/tournois/$id" params={{ id: t.id }} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                  <span className="text-2xl">{SPORT_CONFIG[t.sport_id as SportId]?.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {FORMAT_LABEL[t.format]} · {STATUS_LABEL[t.status]}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              ))
            )}
          </Section>
          <Link to="/admin/utilisateurs" className="flex items-center gap-3 rounded-2xl border bg-card p-4">
            <Users className="h-5 w-5 text-primary" />
            <span className="flex-1 font-semibold">Utilisateurs & rôles (marqueurs)</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </>
      )}
    </div>
  );
}

type TournamentForm = { id?: string; name: string; sport_id: string; format: "poules" | "elimination"; start_date: string; end_date: string; status: "a_venir" | "en_cours" | "termine" };

export function TournamentDialog({ initial, onDone, trigger }: { initial?: TournamentForm; onDone: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<TournamentForm>(
    initial ?? { name: "", sport_id: "football", format: "poules", start_date: "", end_date: "", status: "a_venir" },
  );
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = { ...f, start_date: f.start_date || null, end_date: f.end_date || null };
    const { id, ...rest } = payload;
    const res = id ? await supabase.from("tournaments").update(rest).eq("id", id) : await supabase.from("tournaments").insert(rest);
    setBusy(false);
    if (res.error) return toast.error(errMsg(res.error));
    toast.success("Tournoi enregistré");
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nouveau
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le tournoi" : "Nouveau tournoi"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sport</Label>
              <Select value={f.sport_id} onValueChange={(v) => setF({ ...f, sport_id: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="football">Football</SelectItem>
                  <SelectItem value="basketball">Basketball</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select value={f.format} onValueChange={(v) => setF({ ...f, format: v as TournamentForm["format"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="poules">Poules</SelectItem>
                  <SelectItem value="elimination">Élimination directe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Début</Label>
              <Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Fin</Label>
              <Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as TournamentForm["status"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a_venir">À venir</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            Enregistrer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
