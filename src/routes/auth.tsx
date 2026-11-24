import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo, Spinner } from "@/components/common";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — espace organisateurs" },
      { name: "description", content: "Connexion réservée aux administrateurs et marqueurs." },
      { property: "og:title", content: "Connexion organisateurs" },
      { property: "og:description", content: "Espace réservé aux administrateurs et marqueurs." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading, roles } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && roles.length) navigate({ to: "/admin" });
  }, [loading, user, roles, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Connecté !");
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
        if (error) throw error;
        toast.success("Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse.");
        setMode("in");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast.error(msg.includes("Invalid login") ? "E-mail ou mot de passe incorrect." : msg);
    } finally {
      setBusy(false);
    }
  }

  if (user && !loading && !roles.length)
    return (
      <div className="mx-auto max-w-sm space-y-4 rounded-3xl border bg-card p-6 text-center">
        <h1 className="font-display text-2xl font-bold uppercase">Compte en attente</h1>
        <p className="text-sm text-muted-foreground">
          Vous êtes connecté avec {user.email}, mais aucun rôle ne vous est encore attribué. Demandez à un administrateur de vous nommer marqueur.
        </p>
        <Button variant="secondary" onClick={() => supabase.auth.signOut()}>
          Se déconnecter
        </Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-6">
      <div className="text-center">
        <Logo className="text-4xl" />
        <p className="mt-2 text-sm text-muted-foreground">Espace organisateurs (admin & marqueurs). Les supporters n'ont pas besoin de compte.</p>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-3xl border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">Mot de passe</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
        </div>
        <Button type="submit" className="h-12 w-full text-base font-bold" disabled={busy}>
          {busy && <Spinner />} {mode === "in" ? "Se connecter" : "Créer un compte"}
        </Button>
        <button type="button" className="w-full text-sm text-muted-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Pas de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
        </button>
        <p className="text-center text-xs text-muted-foreground">Après la création du compte, un administrateur doit vous attribuer un rôle.</p>
      </form>
    </div>
  );
}
