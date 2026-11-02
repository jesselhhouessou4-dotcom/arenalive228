import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminGate, BackLink, errMsg } from "@/components/admin-ui";
import { ErrorBox, LoadingList } from "@/components/common";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/utilisateurs")({
  head: () => ({ meta: [{ title: "Admin — utilisateurs" }, { name: "description", content: "Attribution des rôles." }] }),
  component: () => (
    <AdminGate>
      <Users />
    </AdminGate>
  ),
});

function Users() {
  const q = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [p, r] = await Promise.all([supabase.from("profiles").select("*").order("created_at"), supabase.from("user_roles").select("*")]);
      if (p.error) throw p.error;
      return (p.data ?? []).map((u) => ({ ...u, roles: (r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role) }));
    },
  });
  async function toggle(uid: string, role: "admin" | "marqueur", on: boolean) {
    const res = on ? await supabase.from("user_roles").insert({ user_id: uid, role }) : await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
    if (res.error) return toast.error(errMsg(res.error));
    q.refetch();
  }
  return (
    <div className="space-y-4">
      <BackLink to="/admin">Espace admin</BackLink>
      <h1 className="font-display text-3xl font-extrabold uppercase">Utilisateurs</h1>
      <p className="text-sm text-muted-foreground">Les personnes créent leur compte via « Connexion », puis vous leur attribuez un rôle ici.</p>
      {q.isLoading ? <LoadingList /> : q.error ? <ErrorBox error={q.error} /> : q.data!.map((u) => (
        <div key={u.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{u.display_name}</p><p className="truncate text-xs text-muted-foreground">{u.email}</p></div>
          <label className="flex flex-col items-center text-[10px]">Marqueur<Switch checked={u.roles.includes("marqueur")} onCheckedChange={(v) => toggle(u.id, "marqueur", v)} /></label>
          <label className="flex flex-col items-center text-[10px]">Admin<Switch checked={u.roles.includes("admin")} onCheckedChange={(v) => toggle(u.id, "admin", v)} /></label>
        </div>
      ))}
    </div>
  );
}
