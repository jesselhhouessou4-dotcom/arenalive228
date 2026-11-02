import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { errMsg } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TournamentForm = { id?: string; name: string; sport_id: string; format: "poules" | "elimination"; start_date: string; end_date: string; status: "a_venir" | "en_cours" | "termine" };

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
