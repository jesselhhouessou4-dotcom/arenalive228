import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playersQuery, teamQuery, uploadPhoto } from "@/lib/queries";
import { AdminGate, BackLink, errMsg } from "@/components/admin-ui";
import { ErrorBox, LoadingList, PlayerAvatar, Section, Spinner, TeamBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Player } from "@/lib/sports";

export const Route = createFileRoute("/_authenticated/admin/equipes/$id")({
  head: () => ({ meta: [{ title: "Admin — équipe" }, { name: "description", content: "Gestion de l'effectif." }] }),
  component: () => (
    <AdminGate>
      <AdminTeam />
    </AdminGate>
  ),
});

function AdminTeam() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const team = useQuery(teamQuery(id));
  const players = useQuery(playersQuery(id));
  const [f, setF] = useState({ name: "", jersey_number: "", position: "" });
  const reload = () => qc.invalidateQueries({ queryKey: ["players", id] });

  if (team.isLoading) return <LoadingList />;
  if (team.error) return <ErrorBox error={team.error} />;
  const t = team.data!;

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("players").insert({ team_id: id, name: f.name, jersey_number: f.jersey_number ? Number(f.jersey_number) : null, position: f.position || null });
    if (error) return toast.error(errMsg(error));
    setF({ name: "", jersey_number: "", position: "" });
    reload();
  }
  async function delTeam() {
    if (!confirm("Supprimer l'équipe ?")) return;
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) return toast.error(errMsg(error));
    history.back();
  }

  return (
    <div className="space-y-6">
      <BackLink to="/admin/tournois/$id" params={{ id: t.tournament_id }}>Tournoi</BackLink>
      <div className="flex items-center gap-3">
        <TeamBadge team={t} size={56} />
        <h1 className="flex-1 font-display text-3xl font-extrabold uppercase">{t.name}</h1>
        <Button variant="ghost" size="icon" onClick={delTeam} aria-label="Supprimer l'équipe"><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
      <form onSubmit={addPlayer} className="grid grid-cols-[1fr_70px_90px_auto] gap-2">
        <Input required placeholder="Nom du joueur" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input type="number" placeholder="N°" value={f.jersey_number} onChange={(e) => setF({ ...f, jersey_number: e.target.value })} />
        <Input placeholder="Poste" value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} />
        <Button type="submit">Ajouter</Button>
      </form>
      <Section title={`Effectif (${players.data?.length ?? 0})`}>
        {players.isLoading ? <LoadingList rows={2} /> : (players.data ?? []).map((p) => <PlayerRow key={p.id} p={p} onChange={reload} />)}
      </Section>
    </div>
  );
}

function PlayerRow({ p, onChange }: { p: Player; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  async function upd(patch: Partial<Player>) {
    const { error } = await supabase.from("players").update(patch).eq("id", p.id);
    if (error) toast.error(errMsg(error));
    else onChange();
  }
  async function photo(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      await upd({ photo_url: await uploadPhoto(file, p.team_id) });
      toast.success("Photo mise à jour");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-card p-2">
      <label className="relative cursor-pointer" title="Changer la photo">
        <PlayerAvatar player={p} size={44} />
        {busy && <Spinner className="absolute inset-0 m-auto" />}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => photo(e.target.files?.[0])} />
      </label>
      <Input className="w-14" type="number" defaultValue={p.jersey_number ?? ""} onBlur={(e) => upd({ jersey_number: e.target.value ? Number(e.target.value) : null })} />
      <Input defaultValue={p.name} onBlur={(e) => e.target.value !== p.name && upd({ name: e.target.value })} />
      <Input className="w-24" defaultValue={p.position ?? ""} onBlur={(e) => upd({ position: e.target.value || null })} />
      <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={async () => { if (confirm(`Supprimer ${p.name} ?`)) { await supabase.from("players").delete().eq("id", p.id); onChange(); } }}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
