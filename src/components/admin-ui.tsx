import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LoadingList } from "@/components/common";

export function AdminGate({ children, allowScorer }: { children: ReactNode; allowScorer?: boolean }) {
  const { loading, isAdmin, isScorer } = useAuth();
  if (loading) return <LoadingList rows={2} />;
  if (!isAdmin && !(allowScorer && isScorer))
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border bg-card p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <p className="font-semibold">Accès réservé {allowScorer ? "aux administrateurs et marqueurs" : "aux administrateurs"}.</p>
        <Link to="/" className="text-sm text-primary">
          Retour à l'accueil
        </Link>
      </div>
    );
  return <>{children}</>;
}

export function BackLink({ to, params, children }: { to: string; params?: Record<string, string>; children: ReactNode }) {
  return (
    <Link to={to} params={params} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> {children}
    </Link>
  );
}

export function errMsg(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes("row-level security") || m.includes("permission denied")) return "Action non autorisée pour votre rôle.";
  return m;
}
